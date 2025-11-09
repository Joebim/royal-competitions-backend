import { Request, Response, NextFunction } from 'express';
import { Order } from '../models';
import {
  OrderPaymentStatus,
  OrderStatus,
} from '../models/Order.model';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/apiResponse';
import { getPagination } from '../utils/pagination';
import { UserRole } from '../models';

const formatOrderResponse = (order: any) => {
  const doc = order.toObject ? order.toObject() : order;
  return {
    id: doc._id,
    orderNumber: doc.orderNumber,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    subtotal: doc.subtotal,
    total: doc.total,
    currency: doc.currency,
    items: doc.items.map((item: any) => ({
      id: item._id,
      competitionId: item.competitionId,
      competitionTitle: item.competitionTitle,
      quantity: item.quantity,
      ticketPrice: item.ticketPrice,
      total: item.total,
      ticketNumbers: item.ticketNumbers,
      answer: item.answer,
    })),
    billingDetails: doc.billingDetails,
    billingAddress: doc.billingAddress,
    shippingAddress: doc.shippingAddress,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
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

export const getMyOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const status = req.query.status as OrderStatus | undefined;
    const paymentStatus = req.query
      .paymentStatus as OrderPaymentStatus | undefined;

    const query: Record<string, any> = { userId: req.user._id };
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const { skip, limit: pageLimit } = getPagination(page, limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments(query),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      throw new ApiError('Order not found', 404);
    }

    if (!req.user) {
      throw new ApiError('Not authorized', 401);
    }

    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(
      req.user.role
    );

    const requesterId = String(req.user._id);

    if (
      order.userId.toString() !== requesterId &&
      !isAdmin
    ) {
      throw new ApiError('Not authorized to access this order', 403);
    }

    res.json(
      ApiResponse.success(
        { order: formatOrderResponse(order) },
        'Order retrieved successfully'
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getUserOrdersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const userId = req.params.userId;

    const [orders, total] = await Promise.all([
      Order.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments({ userId }),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};

export const getAllOrdersForAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const { skip, limit: pageLimit } = getPagination(page, limit);

    const filters: Record<string, any> = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.paymentStatus) filters.paymentStatus = req.query.paymentStatus;

    if (req.query.search) {
      filters.$or = [
        { orderNumber: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageLimit),
      Order.countDocuments(filters),
    ]);

    res.json(
      ApiResponse.success(
        {
          orders: orders.map((order) => formatOrderResponse(order)),
        },
        'Orders retrieved successfully',
        buildPaginationMeta(page, pageLimit, total)
      )
    );
  } catch (error) {
    next(error);
  }
};