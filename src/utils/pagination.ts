export const getPagination = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return {
    skip,
    limit,
  };
};

export const formatPaginationResponse = (data: any[], total: number, page: number, limit: number) => {
  return {
    data,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};




