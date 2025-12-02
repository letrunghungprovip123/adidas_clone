import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Pagination, Spin, Empty, Checkbox, Radio, Slider, Switch } from "antd";
import CollapseProduct from "./CollapseProduct";
import CardProduct from "../Cards/CardProduct";
import data2 from "../../assets/dataJson/ListProductJson/RelatedStories.json";
import { getProductCategory } from "../../api/productApi";
import { useSearchStore } from "../../store/useSearchStore";

const BodyProduct = ({ sort, onSortChange }) => {
  const [searchParams] = useSearchParams();
  const { results: searchResults, query } = useSearchStore();
  const categoryId = searchParams.get("category");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const isSearchMode = !!searchResults?.length && !categoryId;

  const categories = [
    "Lifestyle",
    "Jordan",
    "Running",
    "Basketball",
    "Football",
    "Training & Gym",
    "Skateboarding",
    "Golf",
    "Tennis",
    "Athletics",
    "Walking",
  ];

  const [filters, setFilters] = useState({
    brand: [],
    gender: "",
    price: [0, 5000000],
    sizes: [],
    colors: [],
    materials: [],
    inStock: false,
  });

  // --- Fetch API (category fallback)
  const { data, isLoading, isError } = useQuery({
    queryKey: ["products-category", categoryId],
    queryFn: () => getProductCategory(categoryId, 1, 200),
    enabled: !!categoryId && !searchResults.length, // chỉ gọi API nếu không ở chế độ search
    select: (res) => res.data,
  });
  // --- Ưu tiên searchResults nếu có
  const allProducts = isSearchMode ? searchResults : data?.products || [];
  // --- Generate facets
  const facets = useMemo(() => {
    const brands = new Set();
    const genders = new Set();
    const sizes = new Set();
    const colors = new Set();
    const materials = new Set();

    allProducts.forEach((p) => {
      if (p.brand) brands.add(p.brand);
      if (p.gender) genders.add(p.gender);
      p.product_variants?.forEach((v) => {
        if (v.size) sizes.add(String(v.size));
        if (v.color) colors.add(v.color);
      });
      const attr = p.attributes || {};
      if (attr.color) colors.add(attr.color);
      if (attr.material) materials.add(attr.material);
    });

    // 👉 thêm size cố định từ 38 đến 45
    const fixedSizes = Array.from({ length: 8 }, (_, i) => (38 + i).toString());

    return {
      brands: Array.from(brands),
      genders: Array.from(genders),
      sizes: Array.from(new Set([...sizes, ...fixedSizes])).sort(
        (a, b) => Number(a) - Number(b)
      ),
      colors: Array.from(colors),
      materials: Array.from(materials),
    };
  }, [allProducts]);

  // --- Filter logic
  const applyFilters = (items) =>
    items.filter((p) => {
      // --- Brand
      if (filters.brand.length && !filters.brand.includes(p.brand))
        return false;

      // --- Gender
      if (filters.gender && p.gender !== filters.gender) return false;

      // --- Price
      const price = Number(p.price || 0);
      if (price < filters.price[0] || price > filters.price[1]) return false;

      // --- Variants info (an toàn hơn)
      const variants = Array.isArray(p.product_variants)
        ? p.product_variants
        : [];
      const sizeSet = new Set(variants.map((v) => String(v.size).trim()));
      const colorSet = new Set(variants.map((v) => v.color));
      const stocks = variants.map((v) => v.stock || 0);

      // --- Size filter (chỉ check nếu có chọn)
      if (
        filters.sizes.length > 0 &&
        filters.sizes.every((s) => !sizeSet.has(String(s)))
      ) {
        return false;
      }

      // --- Color filter
      if (filters.colors.length > 0) {
        const attrColor = p.attributes?.color || "";
        const hasVariantColor = filters.colors.some((c) => colorSet.has(c));
        const hasAttrColor = filters.colors.includes(attrColor);
        if (!hasVariantColor && !hasAttrColor) return false;
      }

      // --- Material
      if (filters.materials.length > 0) {
        const mat = p.attributes?.material;
        if (!mat || !filters.materials.includes(mat)) return false;
      }

      // --- Stock availability
      if (filters.inStock && !stocks.some((s) => s > 0)) return false;

      return true;
    });
  const applySort = (items) => {
    const sorted = [...items];
    switch (sort) {
      case "price_asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "newest":
        return sorted.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      case "name":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  };

  const filteredSorted = useMemo(
    () => applySort(applyFilters(allProducts)),
    [allProducts, filters, sort]
  );

  const total = filteredSorted.length;
  const start = (page - 1) * pageSize;
  const products = filteredSorted.slice(start, start + pageSize);

  const handleChange = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="flex flex-col lg:flex-row">
      {/* SIDEBAR */}
      <div className="w-full lg:w-[260px] mb-6 lg:mb-0">
        <div className="lg:sticky lg:top-[51px]">
          <div className="overflow-visible lg:overflow-y-auto lg:max-h-[calc(100vh-30px)]">
            <div className="w-full lg:w-[240px] pb-[16px] px-4 lg:pl-[48px]">
              <div className="pb-[20px] lg:pb-[40px] flex flex-wrap lg:block gap-3">
                {categories.map((item, index) => (
                  <a
                    key={index}
                    href="#"
                    className="ml-[4px] pb-[10px] pr-[17px] block text-[16px] hover:font-semibold"
                  >
                    {item}
                  </a>
                ))}
              </div>

              <CollapseProduct title="Brand">
                <Checkbox.Group
                  options={facets.brands}
                  value={filters.brand}
                  onChange={(vals) => handleChange("brand", vals)}
                  className="flex flex-col gap-2"
                />
              </CollapseProduct>

              <CollapseProduct title="Gender">
                <Radio.Group
                  onChange={(e) => handleChange("gender", e.target.value)}
                  value={filters.gender}
                  className="flex flex-col gap-2"
                >
                  {facets.genders.map((g) => (
                    <Radio key={g} value={g}>
                      {g}
                    </Radio>
                  ))}
                </Radio.Group>
              </CollapseProduct>

              <CollapseProduct title="Price Range">
                <Slider
                  range
                  step={50000}
                  min={0}
                  max={5000000}
                  value={filters.price}
                  tooltip={{ formatter: (v) => `${v.toLocaleString()}₫` }}
                  onChange={(vals) => handleChange("price", vals)}
                />
                <div className="text-sm text-gray-600 mt-1">
                  {filters.price[0].toLocaleString()}₫ -{" "}
                  {filters.price[1].toLocaleString()}₫
                </div>
              </CollapseProduct>

              <CollapseProduct title="Size">
                <Checkbox.Group
                  options={facets.sizes}
                  value={filters.sizes}
                  onChange={(vals) => handleChange("sizes", vals)}
                  className="grid grid-cols-4 gap-2"
                />
              </CollapseProduct>

              <CollapseProduct title="Colour">
                <Checkbox.Group
                  options={facets.colors}
                  value={filters.colors}
                  onChange={(vals) => handleChange("colors", vals)}
                  className="flex flex-col gap-2"
                />
              </CollapseProduct>

              <CollapseProduct title="Material">
                <Checkbox.Group
                  options={facets.materials}
                  value={filters.materials}
                  onChange={(vals) => handleChange("materials", vals)}
                  className="flex flex-col gap-2"
                />
              </CollapseProduct>

              <CollapseProduct title="Stock Availability">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={filters.inStock}
                    onChange={(checked) => handleChange("inStock", checked)}
                  />
                  <span>Only show available products</span>
                </div>
              </CollapseProduct>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative px-4 lg:pl-[40px] lg:pr-[48px] flex-1">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Spin size="large" />
          </div>
        ) : isError ? (
          <div className="flex justify-center py-20 text-gray-500">
            <Empty description="Không thể tải dữ liệu sản phẩm" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex justify-center py-20 text-gray-500">
            <Empty description="Không có sản phẩm phù hợp" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-[25px] gap-y-[60px]">
              {products.map((product) => (
                <CardProduct key={product.id} product={product} />
              ))}
            </div>

            <div className="flex justify-center mt-[60px] mb-[100px]">
              <Pagination
                current={page}
                total={total}
                pageSize={pageSize}
                showSizeChanger={false}
                onChange={(p) => setPage(p)}
              />
            </div>

            <div className="mb-[80px] mt-[60px]">
              <div className="flex justify-between pr-[48px] mb-[12px]">
                <span className="text-[20px] leading-[1.2]">
                  Related Stories
                </span>
              </div>
              <ul className="overflow-x-auto flex list-none pb-[30px]">
                {data2.map((item, index) => (
                  <li
                    key={index}
                    className="flex-[0_0_80%] sm:flex-[0_0_50%] lg:flex-[0_0_calc(33%-18px)] mr-[12px]"
                  >
                    <a href="#" className="space-y-[8px]">
                      <img src={item.image} alt={item.title} />
                      <div className="text-[#707072] text-[15px]">
                        {item.content}
                      </div>
                      <div className="text-[16px] font-medium">
                        {item.title}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BodyProduct;
