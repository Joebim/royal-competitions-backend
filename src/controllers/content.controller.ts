import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  Champion,
  Competition,
  Draw,
  Review,
  SiteStat,
  User,
  LegalPage,
  FAQ,
  Winner,
  AboutPage,
} from '../models';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiResponse } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

const CACHE_TTL_MS = 5 * 60 * 1000;

let homeCache: {
  data: any | null;
  expiresAt: number;
} = {
  data: null,
  expiresAt: 0,
};

const formatNumber = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M+`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return `${value}`;
};

const calculateProgress = (soldTickets: number, maxTickets: number) => {
  const percentage =
    maxTickets > 0 ? Math.round((soldTickets / maxTickets) * 100) : 0;

  return {
    soldTickets,
    maxTickets,
    entriesRemaining: Math.max(maxTickets - soldTickets, 0),
    percentage: Math.min(percentage, 100),
  };
};

const formatCompetitionCard = (competition: any) => ({
  id: competition._id,
  title: competition.title,
  slug: competition.slug,
  image: competition.images?.[0]?.url || null,
  ticketPrice: competition.ticketPricePence
    ? (competition.ticketPricePence / 100).toFixed(2)
    : '0.00',
  maxTickets: competition.ticketLimit,
  soldTickets: competition.ticketsSold,
  progress: calculateProgress(
    competition.ticketsSold,
    competition.ticketLimit || 0
  ),
  drawDate: competition.drawAt,
  category: competition.category,
  featured: competition.featured,
});

const formatChampionCard = (champion: any) => ({
  id: champion._id,
  winnerName: champion.winnerName,
  winnerLocation: champion.winnerLocation,
  prizeName: champion.prizeName,
  prizeValue: champion.prizeValue,
  testimonial: champion.testimonial,
  image: champion.image?.url || null,
  featured: champion.featured,
});

const formatDrawCard = (draw: any, winner?: any, competition?: any) => ({
  id: draw._id,
  winner:
    winner?.userId?.firstName && winner?.userId?.lastName
      ? `${winner.userId.firstName} ${winner.userId.lastName}`
      : winner?.userId?.firstName || 'Winner',
  location: 'UK', // Location can be added to User model or Winner model if needed
  prize: competition?.prize || winner?.prize || 'Prize',
  prizeValue: competition?.prizeValue || winner?.prizeValue || null,
  ticketNumber: draw.result?.[0]?.ticketNumber || winner?.ticketNumber || null,
  drawDate: draw.drawTime || draw.drawDate,
  image:
    competition?.images?.[0]?.url ||
    winner?.proofImageUrl ||
    draw.evidenceUrl ||
    null,
});

const formatReviewCard = (review: any) => ({
  id: review._id,
  title: review.title,
  body: review.body,
  rating: review.rating,
  reviewer: review.reviewer,
  location: review.location,
  timeAgo: review.timeAgo,
  verified: review.verified,
});

const loadStats = async () => {
  const [totalCompetitions, totalChampions, totalDraws, totalUsers] =
    await Promise.all([
      Competition.countDocuments({
        isActive: true,
        deletedAt: { $exists: false },
      }),
      Champion.countDocuments({ isActive: true }),
      Draw.countDocuments({}),
      User.countDocuments({}),
    ]);

  return [
    {
      key: 'competitions',
      label: 'Competitions',
      value: formatNumber(totalCompetitions),
    },
    {
      key: 'champions',
      label: 'Champions',
      value: formatNumber(totalChampions),
    },
    {
      key: 'draws',
      label: 'Draws',
      value: formatNumber(totalDraws),
    },
    {
      key: 'users',
      label: 'Users',
      value: formatNumber(totalUsers),
    },
  ];
};

export const getHomeContent = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (homeCache.data && Date.now() < homeCache.expiresAt) {
      res.json(ApiResponse.success(homeCache.data, 'Home content retrieved'));
      return;
    }

    const [
      featuredCompetitions,
      competitions,
      champions,
      draws,
      reviews,
      stats,
    ] = await Promise.all([
      Competition.find({
        featured: true,
        isActive: true,
        status: CompetitionStatus.LIVE,
      })
        .sort({ createdAt: -1 })
        .limit(1)
        .lean(),
      Competition.find({
        isActive: true,
        status: CompetitionStatus.LIVE,
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Champion.find({ isActive: true }).sort({ createdAt: -1 }).limit(6).lean(),
      Draw.find({})
        .populate('competitionId', 'title prize prizeValue images')
        .sort({ drawTime: -1 })
        .limit(6)
        .lean(),
      Review.find({ isActive: true }).sort({ publishedAt: -1 }).limit(6).lean(),
      loadStats(),
    ]);

    // Get winners for the draws
    const drawIds = draws.map((draw: any) => draw._id);
    const winners =
      drawIds.length > 0
        ? await Winner.find({ drawId: { $in: drawIds } })
            .populate('userId', 'firstName lastName')
            .lean()
        : [];

    // Create a map of drawId to winner for quick lookup
    const winnerMap = new Map();
    winners.forEach((winner: any) => {
      if (!winnerMap.has(winner.drawId.toString())) {
        winnerMap.set(winner.drawId.toString(), winner);
      }
    });

    // Check for manually set hero competition
    let heroCompetition = null;
    const heroStat = await SiteStat.findOne({
      key: 'HERO_COMPETITION_ID',
    }).lean();
    if (heroStat?.description) {
      // description field stores the competition ID as string
      const heroCompetitionId = heroStat.description;
      heroCompetition = await Competition.findById(heroCompetitionId).lean();
    }

    // Fallback to featured or first competition if no hero is set
    if (!heroCompetition) {
      heroCompetition = featuredCompetitions[0] || competitions[0];
    }

    const hero = heroCompetition
      ? formatCompetitionCard(heroCompetition)
      : null;

    const data = {
      hero,
      competitions: competitions.map(formatCompetitionCard),
      champions: champions.map(formatChampionCard),
      stats,
      recentDraws: draws.map((draw: any) => {
        const winner = winnerMap.get(draw._id.toString());
        const competition = draw.competitionId;
        return formatDrawCard(draw, winner, competition);
      }),
      reviews: reviews.map(formatReviewCard),
    };

    homeCache = {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };

    res.json(ApiResponse.success(data, 'Home content retrieved'));
  } catch (error) {
    next(error);
  }
};

export const getPageContent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    }).lean();

    if (!page) {
      throw new ApiError(`Page with slug '${slug}' does not exist`, 404, true, {
        slug: [`Page with slug '${slug}' does not exist`],
      });
    }

    const pageData = {
      slug: page.slug,
      title: page.title,
      subtitle: page.subtitle,
      updatedAt: page.updatedAt,
      content: page.content,
    };

    res.json(
      ApiResponse.success(
        { page: pageData },
        'Page content retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all legal pages (Public - only active pages)
 * @route   GET /api/v1/content/pages
 * @access  Public
 */
export const getAllLegalPagesPublic = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pages = await LegalPage.find({ isActive: true })
      .select('slug title subtitle updatedAt')
      .sort({ createdAt: -1 })
      .lean();

    res.json(
      ApiResponse.success(
        { pages },
        'Legal pages retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// Legal Page Admin CRUD Operations

/**
 * @desc    Get all legal pages (Admin)
 * @route   GET /api/v1/admin/content/pages
 * @access  Private/Admin
 */
export const getAllLegalPages = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const pages = await LegalPage.find()
      .sort({ createdAt: -1 })
      .select('-__v')
      .lean();

    res.json(
      ApiResponse.success({ pages }, 'Legal pages retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single legal page by slug (Admin)
 * @route   GET /api/v1/admin/content/pages/:slug
 * @access  Private/Admin
 */
export const getLegalPageBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOne({ slug: slug.toLowerCase() }).lean();

    if (!page) {
      throw new ApiError(`Page with slug '${slug}' does not exist`, 404, true, {
        slug: [`Page with slug '${slug}' does not exist`],
      });
    }

    res.json(
      ApiResponse.success({ page }, 'Legal page retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new legal page (Admin)
 * @route   POST /api/v1/admin/content/pages
 * @access  Private/Admin
 */
export const createLegalPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug, title, subtitle, content, isActive } = req.body;

    // Check if page with slug already exists
    const existingPage = await LegalPage.findOne({ slug: slug.toLowerCase() });
    if (existingPage) {
      throw new ApiError(`Page with slug '${slug}' already exists`, 409, true, {
        slug: [`Page with slug '${slug}' already exists`],
      });
    }

    const page = await LegalPage.create({
      slug: slug.toLowerCase(),
      title,
      subtitle,
      content,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id as mongoose.Types.ObjectId | undefined,
      updatedBy: req.user?._id as mongoose.Types.ObjectId | undefined,
    });

    res
      .status(201)
      .json(ApiResponse.success({ page }, 'Legal page created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update legal page (Admin)
 * @route   PUT /api/v1/admin/content/pages/:slug
 * @access  Private/Admin
 */
export const updateLegalPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    const { title, subtitle, content, isActive } = req.body;

    const page = await LegalPage.findOne({ slug: slug.toLowerCase() });

    if (!page) {
      throw new ApiError(`Page with slug '${slug}' does not exist`, 404, true, {
        slug: [`Page with slug '${slug}' does not exist`],
      });
    }

    if (title !== undefined) page.title = title;
    if (subtitle !== undefined) page.subtitle = subtitle;
    if (content !== undefined) page.content = content;
    if (isActive !== undefined) page.isActive = isActive;
    if (req.user) {
      page.updatedBy = req.user._id as any;
    }

    await page.save();

    res.json(ApiResponse.success({ page }, 'Legal page updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete legal page (Admin - soft delete)
 * @route   DELETE /api/v1/admin/content/pages/:slug
 * @access  Private/Admin
 */
export const deleteLegalPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const page = await LegalPage.findOne({ slug: slug.toLowerCase() });

    if (!page) {
      throw new ApiError(`Page with slug '${slug}' does not exist`, 404, true, {
        slug: [`Page with slug '${slug}' does not exist`],
      });
    }

    // Soft delete by setting isActive to false
    page.isActive = false;
    if (req.user) {
      page.updatedBy = req.user._id as any;
    }
    await page.save();

    res.json(ApiResponse.success(null, 'Legal page deleted successfully'));
  } catch (error) {
    next(error);
  }
};

// FAQ Public Operations

/**
 * @desc    Get all FAQs
 * @route   GET /api/v1/content/faqs
 * @access  Public
 */
export const getFAQs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { category } = req.query;

    const validCategories = [
      'General',
      'Competitions',
      'Draws',
      'Payments',
      'Account',
      'Prizes',
      'Technical',
    ];

    const filter: any = { isActive: true };
    if (category) {
      const categoryStr = String(category).trim();
      // Case-insensitive category matching
      const matchedCategory = validCategories.find(
        (cat) => cat.toLowerCase() === categoryStr.toLowerCase()
      );
      if (matchedCategory) {
        filter.category = matchedCategory;
      }
      // If category doesn't match, we'll return empty results (not an error)
    }

    const faqs = await FAQ.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .select('-__v -createdBy -updatedBy')
      .lean();

    const message =
      faqs.length === 0 && category
        ? 'No FAQs found for the specified category'
        : 'FAQs retrieved successfully';

    res.json(ApiResponse.success({ faqs }, message));
  } catch (error) {
    next(error);
  }
};

// FAQ Admin CRUD Operations

/**
 * @desc    Get all FAQs (Admin)
 * @route   GET /api/v1/admin/content/faqs
 * @access  Private/Admin
 */
export const getAllFAQs = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const faqs = await FAQ.find()
      .sort({ order: 1, createdAt: -1 })
      .select('-__v')
      .lean();

    res.json(ApiResponse.success({ faqs }, 'FAQs retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single FAQ by ID (Admin)
 * @route   GET /api/v1/admin/content/faqs/:id
 * @access  Private/Admin
 */
export const getFAQById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findOne({ id }).lean();

    if (!faq) {
      throw new ApiError(`FAQ with ID '${id}' does not exist`, 404, true, {
        id: [`FAQ with ID '${id}' does not exist`],
      });
    }

    res.json(ApiResponse.success({ faq }, 'FAQ retrieved successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new FAQ (Admin)
 * @route   POST /api/v1/admin/content/faqs
 * @access  Private/Admin
 */
export const createFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, question, answer, category, order, isActive } = req.body;

    // Check if FAQ with ID already exists
    const existingFAQ = await FAQ.findOne({ id });
    if (existingFAQ) {
      throw new ApiError(`FAQ with ID '${id}' already exists`, 409, true, {
        id: [`FAQ with ID '${id}' already exists`],
      });
    }

    const faq = await FAQ.create({
      id,
      question,
      answer,
      category,
      order: order !== undefined ? order : 0,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: req.user?._id as mongoose.Types.ObjectId | undefined,
      updatedBy: req.user?._id as mongoose.Types.ObjectId | undefined,
    });

    res
      .status(201)
      .json(ApiResponse.success({ faq }, 'FAQ created successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update FAQ (Admin)
 * @route   PUT /api/v1/admin/content/faqs/:id
 * @access  Private/Admin
 */
export const updateFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { question, answer, category, order, isActive } = req.body;

    const faq = await FAQ.findOne({ id });

    if (!faq) {
      throw new ApiError(`FAQ with ID '${id}' does not exist`, 404, true, {
        id: [`FAQ with ID '${id}' does not exist`],
      });
    }

    if (question !== undefined) faq.question = question;
    if (answer !== undefined) faq.answer = answer;
    if (category !== undefined) faq.category = category;
    if (order !== undefined) faq.order = order;
    if (isActive !== undefined) faq.isActive = isActive;
    if (req.user) {
      faq.updatedBy = req.user._id as any;
    }

    await faq.save();

    res.json(ApiResponse.success({ faq }, 'FAQ updated successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete FAQ (Admin - soft delete)
 * @route   DELETE /api/v1/admin/content/faqs/:id
 * @access  Private/Admin
 */
export const deleteFAQ = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findOne({ id });

    if (!faq) {
      throw new ApiError(`FAQ with ID '${id}' does not exist`, 404, true, {
        id: [`FAQ with ID '${id}' does not exist`],
      });
    }

    // Soft delete by setting isActive to false
    faq.isActive = false;
    if (req.user) {
      faq.updatedBy = req.user._id as any;
    }
    await faq.save();

    res.json(ApiResponse.success(null, 'FAQ deleted successfully'));
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update hero competition (Admin)
 * @route   PATCH /api/v1/admin/content/hero
 * @access  Private/Admin
 */
export const updateHeroCompetition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { competitionId } = req.body;

    if (!competitionId) {
      throw new ApiError('Competition ID is required', 400, true, {
        competitionId: ['Competition ID is required'],
      });
    }

    // Verify competition exists
    const competition = await Competition.findById(competitionId);
    if (!competition) {
      throw new ApiError('Competition not found', 404, true, {
        competitionId: ['Competition not found'],
      });
    }

    // Update or create hero competition stat
    await SiteStat.findOneAndUpdate(
      { key: 'HERO_COMPETITION_ID' },
      {
        key: 'HERO_COMPETITION_ID',
        value: 1, // Dummy value since SiteStat requires a number
        description: competitionId.toString(), // Store competition ID as string in description
        label: 'Hero Competition',
      },
      { upsert: true, new: true }
    );

    // Clear home cache to force refresh
    homeCache = {
      data: null,
      expiresAt: 0,
    };

    res.json(
      ApiResponse.success(
        {
          heroCompetition: formatCompetitionCard(competition),
        },
        'Hero competition updated successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove hero competition (Admin) - resets to automatic selection
 * @route   DELETE /api/v1/admin/content/hero
 * @access  Private/Admin
 */
export const removeHeroCompetition = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await SiteStat.findOneAndDelete({ key: 'HERO_COMPETITION_ID' });

    // Clear home cache to force refresh
    homeCache = {
      data: null,
      expiresAt: 0,
    };

    res.json(
      ApiResponse.success(null, 'Hero competition reset to automatic selection')
    );
  } catch (error) {
    next(error);
  }
};

// About Page Public Operations

/**
 * @desc    Get about page content (Public)
 * @route   GET /api/v1/content/about
 * @access  Public
 */
export const getAboutPage = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aboutPage = await AboutPage.findOne({ isActive: true })
      .select('-__v -createdBy -updatedBy')
      .lean();

    if (!aboutPage) {
      throw new ApiError('About page not found', 404, true, {
        about: ['About page content is not available'],
      });
    }

    res.json(
      ApiResponse.success(
        { about: aboutPage },
        'About page content retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

// About Page Admin CRUD Operations

/**
 * @desc    Get about page content (Admin)
 * @route   GET /api/v1/admin/content/about
 * @access  Private/Admin
 */
export const getAboutPageForAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const aboutPage = await AboutPage.findOne().select('-__v').lean();

    if (!aboutPage) {
      res.json(
        ApiResponse.success(
          { about: null },
          'No about page content found'
        )
      );
      return;
    }

    res.json(
      ApiResponse.success(
        { about: aboutPage },
        'About page content retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update about page content (Admin)
 * @route   POST /api/v1/admin/content/about
 * @access  Private/Admin
 */
export const createOrUpdateAboutPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { hero, story, companyDetails, features, isActive } = req.body;

    // Check if about page already exists
    let aboutPage = await AboutPage.findOne();

    if (aboutPage) {
      // Update existing page
      if (hero !== undefined) {
        if (hero.title !== undefined) aboutPage.hero.title = hero.title;
        if (hero.subtitle !== undefined) aboutPage.hero.subtitle = hero.subtitle;
      }
      if (story !== undefined) {
        if (story.heading !== undefined) aboutPage.story.heading = story.heading;
        if (story.paragraphs !== undefined)
          aboutPage.story.paragraphs = story.paragraphs;
      }
      if (companyDetails !== undefined) {
        aboutPage.companyDetails = companyDetails;
      }
      if (features !== undefined) {
        aboutPage.features = features;
      }
      if (isActive !== undefined) {
        aboutPage.isActive = isActive;
      }
      if (req.user) {
        aboutPage.updatedBy = req.user._id as any;
      }

      await aboutPage.save();

      res.json(
        ApiResponse.success(
          { about: aboutPage },
          'About page updated successfully'
        )
      );
    } else {
      // Create new page
      aboutPage = await AboutPage.create({
        hero,
        story,
        companyDetails,
        features,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user?._id as mongoose.Types.ObjectId | undefined,
        updatedBy: req.user?._id as mongoose.Types.ObjectId | undefined,
      });

      res
        .status(201)
        .json(
          ApiResponse.success(
            { about: aboutPage },
            'About page created successfully'
          )
        );
    }
  } catch (error) {
    next(error);
  }
};
