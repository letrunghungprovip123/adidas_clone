import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../../api/categoriesApi";
import { Dropdown, Spin, Menu, AutoComplete, Input, Drawer } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { path } from "../../common/path/path";
import { useCartStore } from "../../store/cartStore";
import { searchProduct } from "../../api/productApi";
import { useSearchStore } from "../../store/useSearchStore";

const MiddleHeader = () => {
  const { getCount } = useCartStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigate = useNavigate();
  const { setResults } = useSearchStore();

  // =============== CATEGORY MENU ===============
  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const navItems = [
    { label: "New & Featured", key: "featured" },
    { label: "Men", key: "men" },
    { label: "Women", key: "women" },
    { label: "Kids", key: "kids" },
    { label: "Sale", key: "sale" },
  ];

  const createMenu = () => {
    if (isLoading) {
      return (
        <Menu>
          <Menu.Item disabled style={{ textAlign: "center" }}>
            <Spin size="small" /> Đang tải...
          </Menu.Item>
        </Menu>
      );
    }

    return (
      <Menu>
        {categories?.data?.map((cat) => (
          <Menu.Item
            key={cat.id}
            onClick={() =>
              navigate(`${path.listProductPage}?category=${cat.id}`)
            }
          >
            <span className="text-gray-700 hover:text-black block w-full">
              {cat.name}
            </span>
          </Menu.Item>
        ))}
      </Menu>
    );
  };

  // =============== SEARCH FEATURE ===============
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: searchRes, isFetching } = useQuery({
    queryKey: ["search", query],
    queryFn: () => searchProduct(query),
    enabled: query.length > 1,
  });

  const searchData = searchRes?.data?.data || [];

  const searchOptions = searchData.slice(0, 5).map((p) => ({
    value: p.name,
    label: (
      <div
        className="flex items-center w-[400px] gap-2 hover:bg-gray-50 p-1 rounded-md cursor-pointer"
        onClick={() => {
          navigate(`${path.detailProductPage}/${p.id}`);
          setOpen(false);
        }}
      >
        <img
          className="w-15 h-15 object-cover"
          src={p.product_images?.[0]?.image_url || "/placeholder.png"}
        />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium text-gray-800 truncate">
            {p.name}
          </span>
          <span className="text-xs text-gray-500 truncate">
            {p.description}
          </span>
        </div>
      </div>
    ),
  }));

  // =============== RENDER HEADER ===============
  return (
    <div className="px-[43px] max-w-[1920px] mx-auto grid grid-cols-12 items-center">
      {/* Logo */}
      <div className="col-span-2 flex items-center">
        <Link to={path.homePage} className="flex items-center">
          <svg
            aria-hidden="true"
            className="swoosh-svg"
            focusable="false"
            viewBox="0 0 24 24"
            role="img"
            width="78px"
            height="78px"
            fill="none"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M21 8.719L7.836 14.303C6.74 14.768 5.818 15 5.075 15c-.836 0-1.445-.295-1.819-.884-.485-.76-.273-1.982.559-3.272.494-.754 1.122-1.446 1.734-2.108-.144.234-1.415 2.349-.025 3.345.275.2.666.298 1.147.298.386 0 .829-.063 1.316-.19L21 8.719z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </div>

      {/* Navigation */}
      <div className="col-span-7">
        <nav className="h-[60px] flex items-center justify-center">
          <ul
            style={{ fontFamily: "HerticalMedium, sans-serif" }}
            className="hidden md:flex items-center gap-8 text-[#111] text-base font-medium"
          >
            {navItems.map((item) => (
              <li key={item.key}>
                <Dropdown
                  overlay={createMenu(item.key)}
                  trigger={["hover"]}
                  placement="bottomLeft"
                  arrow
                >
                  <span className="cursor-pointer hover:text-gray-600 transition-colors">
                    {item.label}
                  </span>
                </Dropdown>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* MOBILE HAMBURGER */}
      <div className="md:hidden col-span-1 flex justify-end pr-3">
        <button onClick={() => setDrawerOpen(true)}>
          <svg width="28" height="28" viewBox="0 0 24 24">
            <path
              stroke="currentColor"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Search + Icons */}
      <div className="col-span-3 hidden md:flex justify-end items-center gap-4">
        <div className="float-right flex items-center gap-2">
          <AutoComplete
            style={{ width: 250 }}
            dropdownStyle={{
              width: 450,
              padding: 6,
              borderRadius: 8,
            }}
            options={searchOptions}
            open={open && searchOptions.length > 0}
            onSearch={(value) => {
              setQuery(value);
              setOpen(true);
            }}
            onBlur={() => setOpen(false)}
            onFocus={() => query && setOpen(true)}
          >
            <Input
              placeholder="Search..."
              prefix={
                isFetching ? (
                  <Spin size="small" />
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-600"
                  >
                    <path
                      stroke="currentColor"
                      strokeWidth="1.5"
                      d="M13.962 16.296a6.716 6.716 0 01-3.462.954 6.728 6.728 0 01-4.773-1.977A6.728 6.728 0 013.75 10.5c0-1.864.755-3.551 1.977-4.773A6.728 6.728 0 0110.5 3.75c1.864 0 3.551.755 4.773 1.977A6.728 6.728 0 0117.25 10.5a6.726 6.726 0 01-.921 3.407c-.517.882-.434 1.988.289 2.711l3.853 3.853"
                    />
                  </svg>
                )
              }
              className="bg-[#f5f5f5] rounded-full px-2 py-2 w-full text-sm outline-none"
              onPressEnter={() => {
                if (query.trim()) {
                  setResults(searchData, query);
                  navigate(path.listProductPage);
                  setOpen(false);
                }
              }}
            />
          </AutoComplete>

          {/* Wishlist */}
          <Link
            to={path.wishlist}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                stroke="currentColor"
                strokeWidth="1.5"
                d="M16.794 3.75c1.324 0 2.568.516 3.504 1.451a4.96 4.96 0 010 7.008L12 20.508l-8.299-8.299a4.96 4.96 0 010-7.007A4.923 4.923 0 017.205 3.75c1.324 0 2.568.516 3.504 1.451l.76.76.531.531.53-.531.76-.76a4.926 4.926 0 013.504-1.451"
              />
            </svg>
          </Link>

          {/* Cart */}
          <Link
            to={path.cartItems}
            className="relative p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            {getCount() !== 0 && (
              <div className="absolute right-[15px] bottom-[8px] text-[11px]">
                {getCount()}
              </div>
            )}
            <div className="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  d="M8.25 8.25V6a2.25 2.25 0 012.25-2.25h3a2.25 2.25 0 110 4.5H3.75v8.25a3.75 3.75 0 003.75 3.75h9a3.75 3.75 0 003.75-3.75V8.25H17.5"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>

      {/* === MOBILE DRAWER MENU === */}
      <Drawer
        title="Menu"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={280}
      >
        <Menu mode="inline">
          {navItems.map((item) => (
            <Menu.SubMenu key={item.key} title={item.label}>
              {categories?.data?.map((cat) => (
                <Menu.Item
                  key={cat.id}
                  onClick={() => {
                    navigate(`${path.listProductPage}?category=${cat.id}`);
                    setDrawerOpen(false);
                  }}
                >
                  {cat.name}
                </Menu.Item>
              ))}
            </Menu.SubMenu>
          ))}

          <Menu.Item onClick={() => navigate(path.wishlist)}>
            Wishlist
          </Menu.Item>
          <Menu.Item onClick={() => navigate(path.cartItems)}>
            Cart ({getCount()})
          </Menu.Item>
          <Menu.Item onClick={() => navigate(path.signUpPage)}>
            Join Us
          </Menu.Item>
          <Menu.Item onClick={() => navigate(path.signInPage)}>
            Sign In
          </Menu.Item>
        </Menu>
      </Drawer>
    </div>
  );
};

export default MiddleHeader;
