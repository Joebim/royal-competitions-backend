import { Request, Response, NextFunction } from 'express';
import { FilterQuery, SortOrder } from 'mongoose';
import {
  Competition,
  Entry,
  UserRole,
  Category,
  Ticket,
  TicketStatus,
} from '../models';
import { CompetitionStatus, ICompetition } from '../models/Competition.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import cloudinaryService from '../services/cloudinary.service';
import { getPagination } from '../utils/pagination';
import { slugify } from '../utils/slugify';

type CompetitionFilters = FilterQuery<ICompetition>;
type SortQuery = Record<string, SortOrder>;

const parseBooleanParam = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }

  return undefined;
};

const parseNumberParam = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseDateParam = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  
  const dateString = String(value);
  
  // If the date string includes a timezone offset (e.g., +01:00, -05:00)
  // Extract the date/time components and preserve them as-is
  // This prevents timezone conversion - we store the exact time the user specified
  if (dateString.includes('+') || dateString.match(/-\d{2}:\d{2}$/)) {
    // Extract date and time components (ignore timezone offset)
    // Format: YYYY-MM-DDTHH:mm:ss+HH:mm or YYYY-MM-DDTHH:mm:ss-HH:mm
    const match = dateString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (match) {
      const [, datePart, hours, minutes, seconds] = match;
      // Create a new date using the time components as UTC
      // This preserves the wall clock time (21:45 stays 21:45)
      const preservedDate = new Date(`${datePart}T${hours}:${minutes}:${seconds}Z`);
      return Number.isNaN(preservedDate.getTime()) ? undefined : preservedDate;
    }
  }
  
  // For dates without timezone or other formats, use standard parsing
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const buildSortQuery = (sort?: string | string[]): SortQuery => {
  if (!sort) {
    return { createdAt: -1 };
  }

  const sortValue = Array.isArray(sort) ? sort[0] : sort;
  const [field, direction] = sortValue.split(':');

  if (!field) {
    return { createdAt: -1 };
  }

  const sortOrder: SortOrder =
    direction && direction.toLowerCase() === 'asc' ? 1 : -1;

  return { [field]: sortOrder };
};

const buildCompetitionFilters = (
  query: Request['query'],
  includeInactive = false
): CompetitionFilters => {
  const filters: CompetitionFilters = {};

  if (!includeInactive) {
    filters.isActive = true;
    filters.deletedAt = { $exists: false };
    filters.status = { $ne: CompetitionStatus.DRAFT };
  }

  if (query.status) {
    filters.status = query.status as CompetitionStatus;
  }

  if (query.category) {
    filters.category = query.category as string;
  }

  if (parseBooleanParam(query.featured) !== undefined) {
    filters.featured = parseBooleanParam(query.featured);
  }

  if (parseBooleanParam(query.active) !== undefined) {
    filters.isActive = parseBooleanParam(query.active);
  }

  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { shortDescription: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { prize: { $regex: query.search, $options: 'i' } },
    ];
  }

  const priceMin = parseNumberParam(query.priceMin);
  const priceMax = parseNumberParam(query.priceMax);
  if (priceMin !== undefined || priceMax !== undefined) {
    filters.ticketPrice = {};
    // Convert to decimal if provided as pence (>= 1000), otherwise use as decimal
    if (priceMin !== undefined) {
      filters.ticketPrice.$gte = priceMin >= 1000 ? priceMin / 100 : priceMin;
    }
    if (priceMax !== undefined) {
      filters.ticketPrice.$lte = priceMax >= 1000 ? priceMax / 100 : priceMax;
    }
  }

  const prizeMin = parseNumberParam(query.prizeMin);
  const prizeMax = parseNumberParam(query.prizeMax);
  if (prizeMin !== undefined || prizeMax !== undefined) {
    filters.prizeValue = {};
    if (prizeMin !== undefined) {
      filters.prizeValue.$gte = prizeMin;
    }
    if (prizeMax !== undefined) {
      filters.prizeValue.$lte = prizeMax;
    }
  }

  const fromDate = parseDateParam(query.from);
  const toDate = parseDateParam(query.to);
  if (fromDate || toDate) {
    filters.drawAt = {};
    if (fromDate) filters.drawAt.$gte = fromDate;
    if (toDate) filters.drawAt.$lte = toDate;
  }

  if (query.ids) {
    const ids = Array.isArray(query.ids)
      ? query.ids
      : String(query.ids).split(',');
    filters._id = { $in: ids };
  }

  return filters;
};

const parseStringArray = (value: unknown): string[] | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? item.trim() : ''))
          .filter((item) => item.length > 0);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }
  }

  return undefined;
};

const parseSpecifications = (
  value: unknown
): Array<{ label: string; value: string }> | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item: any) => ({
        label: item?.label?.toString().trim(),
        value: item?.value?.toString().trim(),
      }))
      .filter((item) => item.label && item.value);
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any) => ({
            label: item?.label?.toString().trim(),
            value: item?.value?.toString().trim(),
          }))
          .filter((item) => item.label && item.value);
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return undefined;
};

const parseCompetitionPayload = (body: any) => {
  const payload: Partial<ICompetition> = {};

  if (body.title !== undefined) payload.title = body.title;
  if (body.shortDescription !== undefined)
    payload.shortDescription = body.shortDescription;
  if (body.description !== undefined) payload.description = body.description;
  if (body.prize !== undefined) payload.prize = body.prize;

  const prizeValue = parseNumberParam(body.prizeValue ?? body.prize_amount);
  if (prizeValue !== undefined) payload.prizeValue = prizeValue;

  const cashAlternative = parseNumberParam(
    body.cashAlternative ?? body.cash_alternative
  );
  if (cashAlternative !== undefined) {
    payload.cashAlternative = cashAlternative;
  }

  if (body.cashAlternativeDetails !== undefined) {
    payload.cashAlternativeDetails = body.cashAlternativeDetails;
  }

  const originalPrice = parseNumberParam(body.originalPrice);
  if (originalPrice !== undefined) payload.originalPrice = originalPrice;

  // Ticket price in decimal
  const ticketPriceInput = body.ticketPrice ?? body.price ?? body.ticket_price;
  if (
    ticketPriceInput !== undefined &&
    ticketPriceInput !== null &&
    ticketPriceInput !== ''
  ) {
    // Check if input is a string with decimal point (definitely decimal format)
    const isDecimalString =
      typeof ticketPriceInput === 'string' && ticketPriceInput.includes('.');
    const ticketPrice = parseNumberParam(ticketPriceInput);

    if (ticketPrice !== undefined) {
      // If input has decimal point OR value is less than 1, treat as decimal
      // Otherwise, if >= 100 and is whole number, treat as pence
      if (isDecimalString || ticketPrice < 1) {
        // It's already in decimal format (e.g., "0.99", "1.50", "3.99", "0.50")
        payload.ticketPrice = Number(ticketPrice.toFixed(2));
      } else if (
        ticketPrice >= 100 &&
        Math.abs(ticketPrice - Math.round(ticketPrice)) < 0.001
      ) {
        // It's pence (e.g., 100, 199, 500), convert to decimal
        payload.ticketPrice = Number((ticketPrice / 100).toFixed(2));
      } else {
        // Value between 1 and 100 - assume it's already in decimal format
        payload.ticketPrice = Number(ticketPrice.toFixed(2));
      }
    }
  }

  // Ticket limit (null = unlimited)
  const ticketLimit = parseNumberParam(
    body.ticketLimit ?? body.maxTickets ?? body.max_tickets
  );
  if (ticketLimit !== undefined) {
    payload.ticketLimit = ticketLimit;
  } else if (body.ticketLimit === null) {
    payload.ticketLimit = null; // Unlimited
  }

  // Tickets sold
  const ticketsSold = parseNumberParam(body.ticketsSold ?? body.soldTickets);
  if (ticketsSold !== undefined) payload.ticketsSold = ticketsSold;

  // Status
  if (body.status !== undefined) payload.status = body.status;

  // Draw mode
  if (body.drawMode !== undefined) payload.drawMode = body.drawMode;

  // Draw date (drawAt)
  const drawAt = parseDateParam(body.drawAt ?? body.drawDate);
  if (drawAt) payload.drawAt = drawAt;

  // Free entry
  const freeEntryEnabled = parseBooleanParam(
    body.freeEntryEnabled ?? body.freeEntry
  );
  if (freeEntryEnabled !== undefined)
    payload.freeEntryEnabled = freeEntryEnabled;

  // Postal address
  if (body.noPurchasePostalAddress !== undefined) {
    payload.noPurchasePostalAddress = body.noPurchasePostalAddress;
  }

  // Terms URL
  if (body.termsUrl !== undefined) {
    payload.termsUrl = body.termsUrl;
  }

  // Question (optional - for skill-based competitions)
  if (body.question !== undefined) {
    if (
      body.question === null ||
      body.question === '' ||
      (typeof body.question === 'object' &&
        Object.keys(body.question).length === 0)
    ) {
      // Allow removing question by setting to null - will be handled in update function
      payload.question = null as any;
    } else if (typeof body.question === 'object' && body.question.question) {
      payload.question = {
        question: body.question.question,
        options: body.question.options || body.question.answerOptions,
        answerOptions: body.question.answerOptions || body.question.options,
        correctAnswer: body.question.correctAnswer,
        explanation: body.question.explanation || '',
      };
    }
  }

  // Category
  if (body.category !== undefined) payload.category = body.category;

  // Featured
  const featured = parseBooleanParam(body.featured);
  if (featured !== undefined) payload.featured = featured;

  // Active
  const isActive = parseBooleanParam(body.isActive ?? body.active);
  if (isActive !== undefined) payload.isActive = isActive;

  // Dates
  const startDate = parseDateParam(body.startDate);
  if (startDate) payload.startDate = startDate;

  const endDate = parseDateParam(body.endDate);
  if (endDate) payload.endDate = endDate;

  // Arrays
  payload.features = parseStringArray(body.features);
  payload.included = parseStringArray(body.included);
  payload.tags = parseStringArray(body.tags);
  payload.specifications = parseSpecifications(body.specifications);

  // Terms and conditions
  if (body.termsAndConditions !== undefined) {
    payload.termsAndConditions = body.termsAndConditions;
  }

  // Slug
  if (body.slug) {
    payload.slug = slugify(body.slug);
  }

  // Next ticket number (for sequential assignment)
  const nextTicketNumber = parseNumberParam(body.nextTicketNumber);
  if (nextTicketNumber !== undefined)
    payload.nextTicketNumber = nextTicketNumber;

  return payload;
};

const sanitizeCompetition = (competitionDoc: ICompetition) => {
  const competition = competitionDoc.toObject
    ? competitionDoc.toObject()
    : competitionDoc;

  const availableTickets =
    competition.ticketLimit === null
      ? Infinity
      : competition.ticketLimit - competition.ticketsSold;

  const progress =
    competition.ticketLimit === null || competition.ticketLimit === 0
      ? 0
      : Math.round((competition.ticketsSold / competition.ticketLimit) * 100);

  return {
    ...competition,
    progress: {
      soldTickets: competition.ticketsSold,
      maxTickets: competition.ticketLimit,
      entriesRemaining:
        availableTickets === Infinity ? null : Math.max(availableTickets, 0),
      percentage: Math.min(progress, 100),
    },
  };
};

const buildPaginationMeta = (page: number, limit: number, total: number) => ({
  pagination: {
    page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit) || 1,
  },
});

export const getCompetitions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 12;
    const filters = buildCompetitionFilters(req.query);
    const sort = buildSortQuery(
      req.query.sort as string | string[] | undefined
    );

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [items, total] = await Promise.all([
      Competition.find(filters).sort(sort).skip(skip).limit(pageLimit),
      Competition.countDocuments(filters),
    ]);

    const data = items.map((item) => sanitizeCompetition(item));

    res.json(
      ApiResponse.success(
        { competitions: data },
        'Competitions retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getAdminCompetitions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filters = buildCompetitionFilters(req.query, true);
    const sort = buildSortQuery(
      req.query.sort as string | string[] | undefined
    );

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [items, total] = await Promise.all([
      Competition.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(pageLimit)
        .populate('createdBy', 'firstName lastName email'),
      Competition.countDocuments(filters),
    ]);

    const data = items.map((item) => sanitizeCompetition(item));

    res.json(
      ApiResponse.success(
        { competitions: data },
        'Competitions retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const isAdmin = req.user
      ? [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)
      : false;

    // For admins, allow viewing inactive/deleted competitions
    // For non-admins, only show active, non-deleted competitions
    const query: any = { _id: req.params.id };
    if (!isAdmin) {
      query.isActive = true;
      query.deletedAt = { $exists: false };
    }

    const competition = await Competition.findOne(query).populate(
      'createdBy',
      'firstName lastName email'
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition) },
        'Competition retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getCompetitionProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competition = await Competition.findById(req.params.id).select(
      'ticketLimit ticketsSold status isActive drawAt'
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // Calculate actual sold tickets from database (ACTIVE + WINNER tickets)
    // This ensures accuracy even if ticketsSold counter gets out of sync
    const actualSoldTickets = await Ticket.countDocuments({
      competitionId: competition._id,
      status: { $in: [TicketStatus.ACTIVE, TicketStatus.WINNER] },
    });

    // Sync ticketsSold counter if there's a mismatch (but don't update if actual is less - might be refunds)
    // Only sync if actual is greater (indicates counter lag)
    if (actualSoldTickets > competition.ticketsSold) {
      competition.ticketsSold = actualSoldTickets;
      await competition.save();
    }

    // Use the synced value
    const soldTickets = Math.max(competition.ticketsSold, actualSoldTickets);

    const remaining =
      competition.ticketLimit === null
        ? Infinity
        : Math.max(competition.ticketLimit - soldTickets, 0);

    res.json(
      ApiResponse.success(
        {
          progress: {
            soldTickets,
            maxTickets: competition.ticketLimit,
            entriesRemaining: remaining === Infinity ? null : remaining,
            percentage:
              competition.ticketLimit === null || competition.ticketLimit === 0
                ? 0
                : Math.round((soldTickets / competition.ticketLimit) * 100),
          },
          status: competition.status,
          drawAt: competition.drawAt,
        },
        'Competition progress retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to ensure category exists and update usage count
 */
const ensureCategoryExists = async (
  categoryName: string,
  userId?: any
): Promise<void> => {
  if (!categoryName || !categoryName.trim()) {
    return;
  }

  const trimmedName = categoryName.trim();
  const categorySlug = trimmedName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  // Check if category exists
  let category = await Category.findOne({
    $or: [
      { name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } },
      { slug: categorySlug },
    ],
  });

  if (!category) {
    // Auto-create category if it doesn't exist
    // Slug will be auto-generated by the pre-save hook
    category = await Category.create({
      name: trimmedName,
      isUserCreated: !!userId,
      createdBy: userId,
      isActive: true,
      usageCount: 0,
    });
  }

  // Increment usage count
  category.usageCount = (category.usageCount || 0) + 1;
  await category.save();
};

/**
 * Helper function to decrement category usage count
 */
const decrementCategoryUsage = async (categoryName: string): Promise<void> => {
  if (!categoryName || !categoryName.trim()) {
    return;
  }

  const trimmedName = categoryName.trim();
  const category = await Category.findOne({
    name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
  });

  if (category && category.usageCount > 0) {
    category.usageCount = category.usageCount - 1;
    await category.save();
  }
};

export const createCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const payload = parseCompetitionPayload(req.body);
    payload.createdBy = req.user._id as any;
    payload.slug = slugify(payload.slug || payload.title || '');

    if (!payload.title || !payload.description || !payload.prize) {
      throw new ApiError('Missing required fields', 400);
    }

    if (!payload.ticketPrice) {
      throw new ApiError('Ticket price is required', 400);
    }

    // Ensure category exists and update usage count
    if (payload.category) {
      await ensureCategoryExists(payload.category, req.user._id);
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadedImages = await cloudinaryService.uploadMultipleImages(
        req.files as Express.Multer.File[]
      );

      payload.images = uploadedImages.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        thumbnail: img.thumbnail,
      }));
    }

    const competition = await Competition.create(payload);

    res
      .status(201)
      .json(
        ApiResponse.success(
          { competition: sanitizeCompetition(competition) },
          'Competition created successfully'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const updateCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const existing = await Competition.findById(req.params.id);

    if (!existing) {
      throw new ApiError('Competition not found', 404);
    }

    const payload = parseCompetitionPayload(req.body);

    // Handle category change
    if (payload.category && payload.category !== existing.category) {
      // Decrement old category usage
      await decrementCategoryUsage(existing.category);
      // Ensure new category exists and increment usage
      await ensureCategoryExists(payload.category, req.user?._id);
    } else if (payload.category && !existing.category) {
      // Category was added to competition that didn't have one
      await ensureCategoryExists(payload.category, req.user?._id);
    }

    if (payload.title) {
      payload.slug = slugify(payload.slug || payload.title);
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const oldPublicIds = existing.images.map((img) => img.publicId);
      if (oldPublicIds.length) {
        await cloudinaryService.deleteMultipleImages(oldPublicIds);
      }

      const uploadedImages = await cloudinaryService.uploadMultipleImages(
        req.files as Express.Multer.File[]
      );

      payload.images = uploadedImages.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        thumbnail: img.thumbnail,
      }));
    }

    // Handle question removal (null = remove field)
    const updateQuery: any = { ...payload };
    if (payload.question === null) {
      updateQuery.$unset = { question: 1 };
      delete updateQuery.question;
    }

    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true, runValidators: true }
    );

    if (!competition) {
      throw new ApiError('Competition not found after update', 404);
    }

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition) },
        'Competition updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const updateCompetitionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, isActive } = req.body;

    if (status === undefined && isActive === undefined) {
      throw new ApiError('Status or isActive is required', 400);
    }

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set isActive based on status
      if (status === CompetitionStatus.LIVE) {
        updateData.isActive = true;
      } else if (
        status === CompetitionStatus.DRAFT ||
        status === CompetitionStatus.CANCELLED
      ) {
        updateData.isActive = false;
      }
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition) },
        'Competition status updated'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Duplicate a competition (Admin)
 * @route   POST /api/v1/admin/competitions/:id/duplicate
 * @access  Private/Admin
 */
export const duplicateCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const originalCompetition = await Competition.findById(req.params.id);

    if (!originalCompetition) {
      throw new ApiError('Competition not found', 404);
    }

    // Create a copy of the competition
    const competitionData: any = {
      title: `${originalCompetition.title} (Copy)`,
      shortDescription: originalCompetition.shortDescription,
      description: originalCompetition.description,
      prize: originalCompetition.prize,
      prizeValue: originalCompetition.prizeValue,
      cashAlternative: originalCompetition.cashAlternative,
      cashAlternativeDetails: originalCompetition.cashAlternativeDetails,
      originalPrice: originalCompetition.originalPrice,
      ticketPrice:
        originalCompetition.ticketPrice ||
        ((originalCompetition as any).ticketPricePence
          ? (originalCompetition as any).ticketPricePence / 100
          : 0),
      ticketLimit: originalCompetition.ticketLimit,
      ticketsSold: 0, // Reset tickets sold
      status: CompetitionStatus.DRAFT, // Always start as draft
      drawMode: originalCompetition.drawMode,
      drawAt: originalCompetition.drawAt,
      freeEntryEnabled: originalCompetition.freeEntryEnabled,
      noPurchasePostalAddress: originalCompetition.noPurchasePostalAddress,
      termsUrl: originalCompetition.termsUrl,
      question: originalCompetition.question,
      features: originalCompetition.features,
      included: originalCompetition.included,
      specifications: originalCompetition.specifications,
      tags: originalCompetition.tags,
      termsAndConditions: originalCompetition.termsAndConditions,
      category: originalCompetition.category,
      featured: false, // Don't duplicate featured status
      isActive: false, // Always start inactive
      createdBy: req.user._id as any,
      nextTicketNumber: 1, // Reset ticket numbering
    };

    // Copy images (reference, not duplicate upload)
    if (originalCompetition.images && originalCompetition.images.length > 0) {
      competitionData.images = originalCompetition.images.map((img) => ({
        url: img.url,
        publicId: img.publicId,
        thumbnail: img.thumbnail,
      }));
    }

    // Generate new slug
    competitionData.slug = slugify(competitionData.title);

    // Ensure category exists and update usage count
    if (competitionData.category) {
      await ensureCategoryExists(competitionData.category, req.user._id);
    }

    const newCompetition = await Competition.create(competitionData);

    res
      .status(201)
      .json(
        ApiResponse.success(
          { competition: sanitizeCompetition(newCompetition) },
          'Competition duplicated successfully'
        )
      );
  } catch (error) {
    next(error);
  }
};

export const deleteCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competition = await Competition.findById(req.params.id);

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    if (competition.ticketsSold > 0) {
      throw new ApiError(
        'Cannot delete competition with sold tickets. Please cancel instead.',
        400
      );
    }

    // Decrement category usage count
    if (competition.category) {
      await decrementCategoryUsage(competition.category);
    }

    competition.isActive = false;
    competition.deletedAt = new Date();
    await competition.save();

    res.json(ApiResponse.success(null, 'Competition removed successfully'));
  } catch (error) {
    next(error);
  }
};

export const getFeaturedCompetitions = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const competitions = await Competition.find({
      featured: true,
      status: CompetitionStatus.LIVE,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(
      ApiResponse.success(
        {
          competitions: competitions.map((item) => sanitizeCompetition(item)),
        },
        'Featured competitions retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const validateCompetitionAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    // Get the competition
    const competition = await Competition.findById(id).select('question');

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    // If competition doesn't have a question, return true (no validation needed)
    if (!competition.question || !competition.question.correctAnswer) {
      res.json(
        ApiResponse.success(
          { isCorrect: true },
          'Answer validated successfully (no question required)'
        )
      );
      return;
    }

    // Compare answers (case-insensitive and trimmed)
    const submittedAnswer = answer?.trim().toLowerCase() || '';
    const correctAnswer = competition.question.correctAnswer
      .trim()
      .toLowerCase();
    const isCorrect = submittedAnswer === correctAnswer;

    res.json(
      ApiResponse.success(
        { isCorrect },
        isCorrect ? 'Answer is correct' : 'Answer is incorrect'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getCompetitionEntries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const competitionId = req.params.id;

    const [entries, total] = await Promise.all([
      Entry.find({ competitionId })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Entry.countDocuments({ competitionId }),
    ]);

    res.json(
      ApiResponse.success(
        { entries },
        'Entries retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};
