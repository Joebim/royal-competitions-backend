import { Request, Response, NextFunction } from 'express';
import { FilterQuery, SortOrder } from 'mongoose';
import { Competition, Entry, UserRole } from '../models';
import {
  CompetitionStatus,
  ICompetition,
} from '../models/Competition.model';
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
  const date = new Date(String(value));
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
    if (priceMin !== undefined) {
      filters.ticketPrice.$gte = priceMin;
    }
    if (priceMax !== undefined) {
      filters.ticketPrice.$lte = priceMax;
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
    filters.drawDate = {};
    if (fromDate) filters.drawDate.$gte = fromDate;
    if (toDate) filters.drawDate.$lte = toDate;
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

const parseQuestion = (body: any): ICompetition['question'] => {
  if (body.question && typeof body.question === 'object') {
    const options =
      parseStringArray(body.question.options) ||
      parseStringArray(body.question.answerOptions);

    return {
      question: body.question.question || body.question.prompt || '',
      options: options || [],
      correctAnswer:
        body.question.correctAnswer || body.question.answer || '',
      explanation: body.question.explanation,
    };
  }

  if (typeof body.question === 'string') {
    try {
      const parsed = JSON.parse(body.question);
      return parseQuestion({ question: parsed });
    } catch {
      // continue to fall back
    }
  }

  const options =
    parseStringArray(body.answerOptions) ||
    parseStringArray(body.options) ||
    [];

  return {
    question:
      body.questionPrompt ||
      body.prompt ||
      body.questionText ||
      body.question ||
      '',
    options,
    correctAnswer: body.correctAnswer || '',
    explanation: body.explanation,
  };
};

const parseCompetitionPayload = (body: any) => {
  const payload: Partial<ICompetition> & {
    question?: ICompetition['question'];
  } = {};

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

  const ticketPrice = parseNumberParam(
    body.ticketPrice ?? body.price ?? body.ticket_price
  );
  if (ticketPrice !== undefined) payload.ticketPrice = ticketPrice;

  const maxTickets = parseNumberParam(body.maxTickets ?? body.max_tickets);
  if (maxTickets !== undefined) payload.maxTickets = maxTickets;

  const soldTickets = parseNumberParam(body.soldTickets);
  if (soldTickets !== undefined) payload.soldTickets = soldTickets;

  if (body.status !== undefined) payload.status = body.status;
  if (body.category !== undefined) payload.category = body.category;

  const featured = parseBooleanParam(body.featured);
  if (featured !== undefined) payload.featured = featured;

  const isActive = parseBooleanParam(body.isActive ?? body.active);
  if (isActive !== undefined) payload.isActive = isActive;

  const isGuaranteedDraw = parseBooleanParam(
    body.isGuaranteedDraw ?? body.guaranteedDraw
  );
  if (isGuaranteedDraw !== undefined) payload.isGuaranteedDraw = isGuaranteedDraw;

  const startDate = parseDateParam(body.startDate);
  if (startDate) payload.startDate = startDate;

  const endDate = parseDateParam(body.endDate);
  if (endDate) payload.endDate = endDate;

  const drawDate = parseDateParam(body.drawDate);
  if (drawDate) payload.drawDate = drawDate;

  payload.features = parseStringArray(body.features);
  payload.included = parseStringArray(body.included);
  payload.tags = parseStringArray(body.tags);
  payload.specifications = parseSpecifications(body.specifications);
  if (body.termsAndConditions !== undefined) {
    payload.termsAndConditions = body.termsAndConditions;
  }

  const question = parseQuestion(body);
  if (question.question && question.options?.length) {
    payload.question = question;
  }

  if (body.slug) {
    payload.slug = slugify(body.slug);
  }

  return payload;
};

const sanitizeCompetition = (
  competitionDoc: ICompetition,
  includeCorrectAnswer: boolean
) => {
  const competition = competitionDoc.toObject
    ? competitionDoc.toObject()
    : competitionDoc;

  if (!includeCorrectAnswer && competition.question) {
    delete competition.question.correctAnswer;
  }

  const availableTickets = competition.maxTickets - competition.soldTickets;
  const progress =
    competition.maxTickets > 0
      ? Math.round((competition.soldTickets / competition.maxTickets) * 100)
      : 0;

  return {
    ...competition,
    progress: {
      soldTickets: competition.soldTickets,
      maxTickets: competition.maxTickets,
      entriesRemaining: Math.max(availableTickets, 0),
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
      Competition.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(pageLimit),
      Competition.countDocuments(filters),
    ]);

    const data = items.map((item) => sanitizeCompetition(item, false));

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

    const data = items.map((item) => sanitizeCompetition(item, true));

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
    const includeInactive = req.user
      ? [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role)
      : false;
    const competition = await Competition.findById(req.params.id).populate(
      'createdBy',
      'firstName lastName email'
    );

    if (!competition || (!includeInactive && !competition.isActive)) {
      throw new ApiError('Competition not found', 404);
    }

    const includeCorrectAnswer = !!req.user?.role
      && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role);

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition, includeCorrectAnswer) },
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
      'maxTickets soldTickets status isActive drawDate'
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    const remaining = Math.max(
      competition.maxTickets - competition.soldTickets,
      0
    );

    res.json(
      ApiResponse.success(
        {
          progress: {
            soldTickets: competition.soldTickets,
            maxTickets: competition.maxTickets,
            entriesRemaining: remaining,
            percentage:
              competition.maxTickets > 0
                ? Math.round(
                    (competition.soldTickets / competition.maxTickets) * 100
                  )
                : 0,
          },
          status: competition.status,
          drawDate: competition.drawDate,
        },
        'Competition progress retrieved'
      )
    );
  } catch (error) {
    next(error);
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

    if (!payload.question) {
      throw new ApiError('Competition question is required', 400);
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

    res.status(201).json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition, true) },
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

    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!competition) {
      throw new ApiError('Competition not found after update', 404);
    }

    const includeCorrectAnswer = !!req.user?.role
      && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(req.user.role);

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition, includeCorrectAnswer) },
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
    const { status } = req.body;
    if (!status) {
      throw new ApiError('Status is required', 400);
    }

    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    res.json(
      ApiResponse.success(
        { competition: sanitizeCompetition(competition, true) },
        'Competition status updated'
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

    if (competition.soldTickets > 0) {
      throw new ApiError(
        'Cannot delete competition with sold tickets. Please cancel instead.',
        400
      );
    }

    competition.isActive = false;
    competition.deletedAt = new Date();
    await competition.save();

    res.json(
      ApiResponse.success(
        null,
        'Competition removed successfully'
      )
    );
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
      status: CompetitionStatus.ACTIVE,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(
      ApiResponse.success(
        {
          competitions: competitions.map((item) =>
            sanitizeCompetition(item, false)
          ),
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
    const competition = await Competition.findById(req.params.id).select(
      'question'
    );

    if (!competition) {
      throw new ApiError('Competition not found', 404);
    }

    const answer = (req.body.answer || '').toString().trim();
    if (!answer) {
      throw new ApiError('Answer is required', 400);
    }

    const isCorrect =
      answer.toLowerCase() ===
      competition.question.correctAnswer.toLowerCase();

    res.json(
      ApiResponse.success(
        { isCorrect },
        'Answer validated successfully'
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