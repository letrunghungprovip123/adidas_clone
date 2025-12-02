export const RMQ_PATTERN_PRODUCTS = {
  GET_PRODUCT: 'get_product',
  GET_PRODUCT_ID: 'get_product_id',
  CREATE_PRODUCT: 'create_product',
  UPDATE_PRODUCT: 'update_product',
  DELETE_PRODUCT: 'delete_product',
  CREATE_PRODUCT_VARIANT: 'create_product_variant',
  UPDATE_PRODUCT_VARIANT: 'update_product_variant',
  ADD_PRODUCT_IMAGE: 'add_product_image',
  GET_PAGINATED: 'get_paginated_products',
  SEARCH: 'search_products',
  GET_BY_CATEGORY: 'get_products_by_category',
  AI_SUGGESTION: 'ai_suggestion',
};

export const RMQ_PATTERN_REVIEWS = {
  GET_REVIEWS: 'get_reviews',
  GET_REVIEW_ID: 'get_review_id',
  CREATE_REVIEW: 'create_review',
  UPDATE_REVIEW: 'update_review',
  DELETE_REVIEW: 'delete_review',
};

// api-gateway/src/constants.ts & product-service/src/common/constants/rmq.pattern.ts
export const RMQ_PATTERN_CATEGORIES = {
  GET_ALL: 'get_all_categories',
};
