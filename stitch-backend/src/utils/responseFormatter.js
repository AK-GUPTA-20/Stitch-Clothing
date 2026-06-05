class ResponseFormatter {
  static success(data = null, meta = null, message = "Success") {
    const response = {
      status: "success",
      message,
    };
    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;
    return response;
  }

  static error(message = "Error", code = 400, details = null) {
    const response = {
      status: "error",
      code,
      message,
    };
    if (details !== null) response.details = details;
    return response;
  }

  static paginated(data, page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    return this.success(data, {
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  }
}

module.exports = ResponseFormatter;
