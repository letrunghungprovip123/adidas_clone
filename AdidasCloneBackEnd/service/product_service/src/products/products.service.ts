import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { RpcException } from '@nestjs/microservices';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { AiService } from 'src/ai/ai.service';
@Injectable()
export class ProductsService {
  private readonly index = 'products';
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly geminiAI: AiService,
  ) {}

  async getProducts() {
    try {
      const products = await this.prisma.products.findMany({
        include: {
          product_images: true,
          product_variants: true,
        },
      });
      return {
        message: 'Lấy products thành công',
        data: products,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async getProductID(id: any) {
    try {
      const product = await this.prisma.products.findFirst({
        where: { id },
        include: {
          product_images: true,
          product_variants: true,
        },
      });
      if (!product)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      return {
        message: 'Lấy product thành công',
        data: product,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createProduct(data: any) {
    try {
      const product = await this.prisma.products.create({
        data: {
          ...data,
          created_at: new Date(),
          slug: `${data.slug.toString().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        },
      });
      await this.indexProduct({
        ...product,
        created_at: new Date().toISOString().replace('T', ' ').replace('Z', ''),
      });
      return {
        message: 'Tạo products thành công',
        data: product,
      };
    } catch (error) {
      console.error('Error fetching users:', error.message);

      return {
        message: 'Lỗi server',
        error: error.message,
      };
    }
  }

  async updateProduct(id: number, product: any) {
    try {
      let checkId = await this.prisma.products.findFirst({
        where: {
          id,
        },
      });
      if (!checkId)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      const result = await this.prisma.products.update({
        data: { ...product },
        where: { id },
      });
      return {
        message: 'Update products thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async deleteProduct(id: number) {
    try {
      let checkId = await this.prisma.products.findFirst({
        where: {
          id: id,
        },
      });
      if (!checkId)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });
      await this.prisma.products.delete({
        where: { id },
      });
      return {
        message: 'Xoá products thành công',
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async createProductVariant(data: any) {
    try {
      let checkProduct = await this.prisma.products.findFirst({
        where: { id: data.product_id },
      });
      if (!checkProduct)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });

      let result = await this.prisma.product_variants.create({
        data,
      });
      return {
        message: 'Thêm products_variant thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async updateProductVariant(body: any, id: number) {
    try {
      let checkId = await this.prisma.product_variants.findFirst({
        where: {
          id,
        },
      });
      if (!checkId)
        throw new RpcException({
          statusCode: 404,
          message: 'Id ko tồn tại',
        });

      let checkProduct = await this.prisma.products.findFirst({
        where: {
          id: body.product_id,
        },
      });
      if (!checkProduct)
        throw new RpcException({
          statusCode: 404,
          message: 'Product ko tồn tại',
        });

      let result = await this.prisma.product_variants.update({
        where: { id },
        data: { ...body },
      });

      return {
        message: 'update products variant thành công',
        data: result,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async uploadImageCloudinary(payload, body) {
    try {
      const uploadData = {
        buffer: payload.buffer.toString('base64'),
        originalname: payload.originalname,
        mimetype: payload.mimetype,
      };
      const image = await this.cloudinaryService.uploadImage(uploadData);
      const result = await this.prisma.product_images.create({
        data: {
          product_id: Number(body.product_id),
          image_url: image.secure_url,
          alt_text: body.alt_text,
        },
      });
      return {
        data: result,
        message: 'Upload ảnh thành công',
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }

  async indexProduct(product: any) {
    const doc = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || '',
      price: Number(product.price),
      category_id: product.category_id,
      brand: product.brand || '',
      gender: product.gender || '',
      attributes:
        typeof product.attributes === 'string'
          ? JSON.parse(product.attributes)
          : product.attributes || {},
      image_urls: product.product_images?.map((img) => img.image_url) || [],
      created_at: product.created_at,
      '@timestamp': product.created_at || new Date().toISOString(),
    };

    await (this.elasticsearchService as any).index({
      index: this.index,
      id: product.id.toString(),
      body: doc,
    });
  }

  // Xóa index khi delete
  async deleteIndex(id: number) {
    await (this.elasticsearchService as any)
      .delete({
        index: this.index,
        id: id.toString(),
      })
      .catch(() => {}); // ig
  }
  async filterProducts(filters: any) {
    const {
      brand,
      gender,
      price_min,
      price_max,
      sizes,
      colors,
      materials,
      in_stock,
      sort,
    } = filters;

    // ==============================
    // 🔹 BUILD WHERE CONDITION
    // ==============================
    const where: any = {};

    // --- Brand ---
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };

    // --- Gender ---
    if (gender) where.gender = { equals: gender, mode: 'insensitive' };

    // --- Price Range ---
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price.gte = price_min;
      if (price_max) where.price.lte = price_max;
    }

    // --- Product Variants (nested filters) ---
    const productVariantFilters: any = {};

    // Size
    if (sizes) {
      const sizeList = sizes.split(',').map((s) => s.trim());
      productVariantFilters.size = { in: sizeList };
    }

    // Color (ưu tiên từ product_variants trước, nếu null thì attributes.color)
    if (colors) {
      const colorList = colors.split(',').map((c) => c.trim());
      productVariantFilters.color = { in: colorList };
    }

    // Stock Availability
    if (in_stock !== undefined) {
      productVariantFilters.stock = in_stock ? { gt: 0 } : { lte: 0 };
    }

    // --- Material (tìm trong JSONB attributes) ---
    if (materials) {
      const materialList = materials.split(',').map((m) => m.trim());
      where.OR = materialList.map((mat) => ({
        attributes: {
          path: ['material'],
          string_contains: mat,
          mode: 'insensitive',
        },
      }));
    }

    // ==============================
    // 🔹 BUILD ORDER BY
    // ==============================
    const orderBy: any = {};
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc';
        break;
      case 'price_desc':
        orderBy.price = 'desc';
        break;
      case 'name':
        orderBy.name = 'asc';
        break;
      case 'newest':
      default:
        orderBy.created_at = 'desc';
        break;
    }

    // ==============================
    // 🔹 QUERY DATABASE
    // ==============================
    const products = await this.prisma.products.findMany({
      where: {
        ...where,
        product_variants:
          Object.keys(productVariantFilters).length > 0
            ? { some: productVariantFilters }
            : undefined,
      },
      orderBy,
      include: {
        product_images: true,
        product_variants: true,
        categories: { select: { name: true } },
      },
    });

    // ==============================
    // 🔹 RETURN
    // ==============================
    return {
      message: 'Lọc sản phẩm thành công',
      data: products,
      meta: {
        total: products.length,
        appliedFilters: {
          brand,
          gender,
          price_min,
          price_max,
          sizes,
          colors,
          materials,
          in_stock,
          sort,
        },
      },
    };
  }
  async searchProducts(data: any) {
    const { q, page = 1, limit = 100, ...filters } = data;
    const from = (page - 1) * limit;

    const must = q
      ? [
          {
            multi_match: {
              query: q,
              type: 'phrase_prefix',
              fields: ['name^3', 'brand.text', 'description.text', 'slug.text'],
            },
          },
        ]
      : [];

    const filter: any[] = [];
    if (filters.category_id)
      filter.push({ term: { category_id: filters.category_id } });
    if (filters.brand) filter.push({ term: { brand: filters.brand } });
    if (filters.gender) filter.push({ term: { gender: filters.gender } });
    if (filters.price_min || filters.price_max) {
      const range: any = { price: {} };
      if (filters.price_min) range.price.gte = filters.price_min;
      if (filters.price_max) range.price.lte = filters.price_max;
      filter.push({ range });
    }

    const body = {
      from,
      size: limit,
      query: {
        bool: {
          must,
          ...(filter.length > 0 && { filter }),
        },
      },
      highlight: {
        fields: {
          name: { pre_tags: ['<strong>'], post_tags: ['</strong>'] },
          description: { pre_tags: ['<strong>'], post_tags: ['</strong>'] },
        },
      },
      sort: [{ _score: 'desc' }, { created_at: 'desc' }],
    };

    const result = await (this.elasticsearchService as any).search({
      index: this.index,
      body,
    });

    const hits = result.hits.hits;
    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total.value;

    const esProducts = hits.map((hit: any) => ({
      ...hit._source,
      highlight: hit.highlight,
    }));

    const ids = esProducts.map((p: any) => p.id);

    const prismaProducts = ids.length
      ? await this.prisma.products.findMany({
          where: { id: { in: ids } },
          include: {
            product_images: true,
            product_variants: true,
            categories: { select: { name: true } },
          },
        })
      : [];

    const merged = esProducts.map((es: any) => {
      const prisma = prismaProducts.find((p: any) => p.id === es.id);
      return {
        ...es,
        product_images: prisma?.product_images || [],
        product_variants: prisma?.product_variants || [],
        category: prisma?.categories,
      };
    });

    return {
      message: 'Tìm kiếm sản phẩm thành công',
      data: merged,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
        query: q,
      },
    };
  }

  async getProductsByCategory(data: {
    categoryId: number;
    page: number;
    limit: number;
  }) {
    const { categoryId, page = 1, limit = 12 } = data;
    const skip = (page - 1) * limit;

    // Kiểm tra danh mục tồn tại
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      throw new RpcException({
        statusCode: 404,
        message: 'Danh mục không tồn tại',
      });
    }

    // Lấy sản phẩm
    const [products, total] = await Promise.all([
      this.prisma.products.findMany({
        where: { category_id: categoryId },
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          product_images: {
            select: { id: true, image_url: true },
          },
          product_variants: {
            select: {
              id: true,
              size: true,
              color: true,
              stock: true,
            },
          },
          categories: {
            select: { id: true, name: true, slug: true },
          },
        },
      }),
      this.prisma.products.count({
        where: { category_id: categoryId },
      }),
    ]);

    return {
      message: 'Lấy sản phẩm theo danh mục thành công',
      data: {
        category,
        products,
      },
    };
  }

  async aiSuggestion(data: any) {
    try {
      let text = await this.geminiAI.generateSuggestion(data);

      return {
        message: 'Tạo text thành công',
        data: text,
      };
    } catch (error) {
      console.error('Error:', error);
      // Nếu error đã là RpcException chứa statusCode, giữ nguyên
      if (error instanceof RpcException) {
        throw error;
      }
      // Mặc định lỗi server
      throw new RpcException({
        statusCode: 500,
        message: error.message || 'Lỗi hệ thống',
      });
    }
  }
}
