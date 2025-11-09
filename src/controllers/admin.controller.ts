import { Request, Response, NextFunction } from 'express';
import {
  Champion,
  Competition,
  Draw,
  Order,
  User,
} from '../models';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../models/Order.model';
import { CompetitionStatus } from '../models/Competition.model';
import { ApiResponse } from '../utils/apiResponse';

const formatCurrency = (amount: number, currency = 'GBP') => ({
  amount,
  currency,
  formatted: new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount),
});

export const getDashboardSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalCompetitions,
      activeCompetitions,
      totalDraws,
      totalChampions,
      featuredChampions,
      totalUsers,
      revenueAggregate,
      recentDraws,
      recentOrders,
    ] = await Promise.all([
      Competition.countDocuments({}),
      Competition.countDocuments({
        status: CompetitionStatus.ACTIVE,
        isActive: true,
      }),
      Draw.countDocuments({}),
      Champion.countDocuments({}),
      Champion.countDocuments({ featured: true, isActive: true }),
      User.countDocuments({}),
      Order.aggregate([
        {
          $match: {
            paymentStatus: OrderPaymentStatus.PAID,
            status: { $in: [OrderStatus.PROCESSING, OrderStatus.COMPLETED] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),
      Draw.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Order.find({ paymentStatus: OrderPaymentStatus.PAID })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean(),
    ]);

    const revenueTotal = revenueAggregate[0]?.total || 0;

    const recentActivity = [
      ...recentDraws.map((draw) => ({
        type: 'draw_created',
        description: `Draw completed for ${draw.prizeName}`,
        data: {
          prizeName: draw.prizeName,
          winnerName: draw.winnerName,
          winnerLocation: draw.winnerLocation,
        },
        timestamp: draw.createdAt,
      })),
      ...recentOrders.map((order) => ({
        type: 'order_paid',
        description: `Order ${order.orderNumber} paid`,
        data: {
          total: order.total,
          currency: order.currency,
        },
        timestamp: order.updatedAt,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    res.json(
      ApiResponse.success(
        {
          competitions: {
            total: totalCompetitions,
            active: activeCompetitions,
          },
          draws: {
            total: totalDraws,
          },
          champions: {
            total: totalChampions,
            featured: featuredChampions,
          },
          users: {
            total: totalUsers,
          },
          revenue: formatCurrency(revenueTotal),
          recentActivity,
        },
        'Dashboard summary retrieved'
      )
    );
  } catch (error) {
    next(error);
  }
};

