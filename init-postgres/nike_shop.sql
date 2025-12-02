-- -------------------------------------------------------------
-- TablePlus 6.7.4(642)
--
-- https://tableplus.com/
--
-- Database: mydb
-- Generation Time: 2025-12-02 14:35:07.9940
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."orders";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS orders_id_seq;

-- Table Definition
CREATE TABLE "public"."orders" (
    "id" int4 NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
    "user_id" int4,
    "discount_code_id" int4,
    "total_amount" numeric(10,2),
    "status" varchar(50) DEFAULT 'pending'::character varying,
    "created_at" timestamp DEFAULT now(),
    "shipping_cost" numeric(10,2) DEFAULT 0,
    "points_used" int4 DEFAULT 0,
    "guest_email" varchar(150),
    "shipping_address_id" int4,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."order_items";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS order_items_id_seq;

-- Table Definition
CREATE TABLE "public"."order_items" (
    "id" int4 NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    "order_id" int4,
    "product_variant_id" int4,
    "quantity" int4,
    "price" numeric(10,2),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."product_variants";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS product_variants_id_seq;

-- Table Definition
CREATE TABLE "public"."product_variants" (
    "id" int4 NOT NULL DEFAULT nextval('product_variants_id_seq'::regclass),
    "product_id" int4,
    "size" varchar(10),
    "color" varchar(50),
    "stock" int4 DEFAULT 0,
    "sku" varchar(100),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."products";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS products_id_seq;

-- Table Definition
CREATE TABLE "public"."products" (
    "id" int4 NOT NULL DEFAULT nextval('products_id_seq'::regclass),
    "name" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL,
    "description" text,
    "price" numeric(10,2) NOT NULL,
    "category_id" int4,
    "brand" varchar(100),
    "gender" varchar(10),
    "attributes" jsonb,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."product_images";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS product_images_id_seq;

-- Table Definition
CREATE TABLE "public"."product_images" (
    "id" int4 NOT NULL DEFAULT nextval('product_images_id_seq'::regclass),
    "product_id" int4,
    "image_url" text,
    "alt_text" text,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."users";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS users_id_seq;

-- Table Definition
CREATE TABLE "public"."users" (
    "id" int4 NOT NULL DEFAULT nextval('users_id_seq'::regclass),
    "email" varchar(150) NOT NULL,
    "password_hash" text NOT NULL,
    "name" varchar(100),
    "avatar_url" text,
    "phone" varchar(20),
    "address" text,
    "is_email_verified" bool DEFAULT false,
    "is_admin" bool DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "social_id" varchar(255),
    "social_provider" varchar(50),
    "otp_code" text,
    "otp_expires_at" timestamp(3),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."addresses";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS addresses_id_seq;

-- Table Definition
CREATE TABLE "public"."addresses" (
    "id" int4 NOT NULL DEFAULT nextval('addresses_id_seq'::regclass),
    "user_id" int4,
    "receiver_name" varchar(100),
    "phone" varchar(20),
    "address_line" text,
    "city" varchar(100),
    "district" varchar(100),
    "is_default" bool DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."cart_items";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS cart_items_id_seq;

-- Table Definition
CREATE TABLE "public"."cart_items" (
    "id" int4 NOT NULL DEFAULT nextval('cart_items_id_seq'::regclass),
    "user_id" int4,
    "product_variant_id" int4,
    "quantity" int4 DEFAULT 1,
    "added_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."loyalty_points";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS loyalty_points_id_seq;

-- Table Definition
CREATE TABLE "public"."loyalty_points" (
    "id" int4 NOT NULL DEFAULT nextval('loyalty_points_id_seq'::regclass),
    "user_id" int4,
    "points" int4 DEFAULT 0,
    "updated_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."wishlists";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS wishlists_id_seq;

-- Table Definition
CREATE TABLE "public"."wishlists" (
    "id" int4 NOT NULL DEFAULT nextval('wishlists_id_seq'::regclass),
    "user_id" int4,
    "product_id" int4,
    "created_at" timestamp DEFAULT now(),
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."reviews";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS reviews_id_seq;

-- Table Definition
CREATE TABLE "public"."reviews" (
    "id" int4 NOT NULL DEFAULT nextval('reviews_id_seq'::regclass),
    "user_id" int4,
    "product_id" int4,
    "rating" int4 CHECK ((rating >= 1) AND (rating <= 5)),
    "comment" text,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."discount_codes";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS discount_codes_id_seq;

-- Table Definition
CREATE TABLE "public"."discount_codes" (
    "id" int4 NOT NULL DEFAULT nextval('discount_codes_id_seq'::regclass),
    "code" varchar(50) NOT NULL,
    "description" text,
    "discount_type" varchar(20) CHECK ((discount_type)::text = ANY (ARRAY[('percent'::character varying)::text, ('fixed'::character varying)::text])),
    "value" numeric(10,2),
    "min_order_amount" numeric(10,2),
    "usage_limit" int4,
    "used_count" int4 DEFAULT 0,
    "valid_from" date,
    "valid_to" date,
    "is_active" bool DEFAULT true,
    PRIMARY KEY ("id")
);

DROP TABLE IF EXISTS "public"."categories";
-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS categories_id_seq;

-- Table Definition
CREATE TABLE "public"."categories" (
    "id" int4 NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
    "name" varchar(100) NOT NULL,
    "slug" varchar(100) NOT NULL,
    "description" text,
    PRIMARY KEY ("id")
);

INSERT INTO "public"."orders" ("id", "user_id", "discount_code_id", "total_amount", "status", "created_at", "shipping_cost", "points_used", "guest_email", "shipping_address_id") VALUES
(1, 12, NULL, 150.00, 'pending', '2025-10-30 14:45:03.627', 10.00, 0, NULL, NULL),
(2, 12, 2, 1000000.00, 'pending', '2025-10-31 07:01:44.406', 30000.00, 0, NULL, NULL),
(3, 14, NULL, 25460000.00, 'pending', '2025-11-07 03:32:40.2', 0.00, 0, NULL, NULL),
(18, 14, NULL, 16170000.00, 'shipped', '2025-11-07 06:43:14.291', 0.00, 0, NULL, NULL),
(19, 14, NULL, 7180000.00, 'shipped', '2025-11-07 06:54:40.548', 0.00, 0, NULL, NULL),
(20, 14, NULL, 7180000.00, 'delivered', '2025-11-07 07:12:00.331', 0.00, 0, NULL, NULL),
(21, 23, 2, 9700019.47, 'pending', '2025-12-02 04:30:00.746', 0.00, 0, NULL, NULL),
(23, NULL, NULL, 4138193.10, 'pending', '2025-12-02 05:30:43.838', 0.00, 0, 'fibuzeq@mailinator.com', NULL),
(25, 23, NULL, 22068481.35, 'pending', '2025-12-02 05:52:43.094', 0.00, 0, NULL, 32);

INSERT INTO "public"."order_items" ("id", "order_id", "product_variant_id", "quantity", "price") VALUES
(1, 2, 1, 2, 199000.00),
(2, 2, 2, 1, 199000.00),
(3, 2, 3, 1, 299000.00),
(4, 2, 4, 3, 149000.00),
(5, 3, 15, 2, 7290000.00),
(6, 3, 13, 1, 7290000.00),
(7, 3, 8, 1, 3590000.00),
(50, 18, 20, 3, 5390000.00),
(51, 19, 8, 2, 3590000.00),
(52, 20, 7, 2, 3590000.00),
(53, 21, 450, 3, 3250006.49),
(55, 23, 481, 1, 4138193.10),
(57, 25, 379, 5, 4413696.27);

INSERT INTO "public"."product_variants" ("id", "product_id", "size", "color", "stock", "sku") VALUES
(1, 1, '40', 'black', 20, 'SKU-UB22-40-BLK'),
(2, 1, '41', 'white', 15, 'SKU-UB22-41-WHT'),
(3, 5, 'XL', 'Đen', 300, 'CCCCC'),
(4, 1, 'S', 'Đỏ', 50, 'PROD1-S-RED'),
(7, 10, '40', 'Trắng', 15, 'NIKE-RUN-WHITE-40'),
(8, 10, '41', 'Đen', 20, 'NIKE-RUN-BLACK-41'),
(9, 10, '42', 'Xanh dương', 10, 'NIKE-RUN-BLUE-42'),
(10, 11, 'M', 'Đen', 25, 'NIKE-TEE-BLACK-M'),
(11, 11, 'L', 'Trắng', 30, 'NIKE-TEE-WHITE-L'),
(12, 11, 'XL', 'Xám', 18, 'NIKE-TEE-GREY-XL'),
(13, 12, '41', 'Đỏ', 12, 'NIKE-JORDAN-RED-41'),
(14, 12, '42', 'Đen', 18, 'NIKE-JORDAN-BLACK-42'),
(15, 12, '43', 'Trắng', 10, 'NIKE-JORDAN-WHITE-43'),
(16, 13, '40', 'Trắng', 22, 'NIKE-LIFESTYLE-WHITE-40'),
(17, 13, '41', 'Be', 16, 'NIKE-LIFESTYLE-BE-41'),
(18, 13, '42', 'Xanh olive', 11, 'NIKE-LIFESTYLE-OLIVE-42'),
(19, 14, 'M', 'Đen', 20, 'NIKE-MEN-BLACK-M'),
(20, 14, 'L', 'Xanh navy', 15, 'NIKE-MEN-NAVY-L'),
(21, 14, 'XL', 'Trắng', 12, 'NIKE-MEN-WHITE-XL'),
(22, 15, 'S', 'Hồng', 20, 'NIKE-WOMEN-PINK-S'),
(23, 15, 'M', 'Tím', 17, 'NIKE-WOMEN-PURPLE-M'),
(24, 15, 'L', 'Đen', 10, 'NIKE-WOMEN-BLACK-L'),
(25, 16, '38', 'Trắng', 25, 'NIKE-KIDS-WHITE-38'),
(26, 16, '39', 'Đỏ', 15, 'NIKE-KIDS-RED-39'),
(27, 16, '40', 'Xanh', 20, 'NIKE-KIDS-BLUE-40'),
(28, 17, '41', 'Đen', 22, 'NIKE-AIRMAX-BLACK-41'),
(29, 17, '42', 'Trắng', 18, 'NIKE-AIRMAX-WHITE-42'),
(30, 17, '43', 'Xanh lá', 10, 'NIKE-AIRMAX-GREEN-43'),
(31, 18, '40', 'Trắng', 15, 'NIKE-TRAIN-WHITE-40'),
(32, 18, '41', 'Đen', 20, 'NIKE-TRAIN-BLACK-41'),
(33, 18, '42', 'Xám', 14, 'NIKE-TRAIN-GREY-42'),
(34, 19, 'M', 'Đen', 15, 'NIKE-HOODIE-BLACK-M'),
(35, 19, 'L', 'Trắng', 18, 'NIKE-HOODIE-WHITE-L'),
(36, 19, 'XL', 'Xanh navy', 12, 'NIKE-HOODIE-NAVY-XL'),
(37, 20, '41', 'Trắng', 15, 'NIKE-AIRFORCE-WHITE-41'),
(38, 20, '42', 'Đen', 18, 'NIKE-AIRFORCE-BLACK-42'),
(39, 20, '43', 'Xanh dương', 10, 'NIKE-AIRFORCE-BLUE-43'),
(40, 40, '37', 'Đen', 24, 'NIKE-40-37-13160'),
(41, 41, '37', 'Xám', 18, 'NIKE-41-37-21b71'),
(42, 42, '37', 'Trắng', 20, 'NIKE-42-37-d713c'),
(43, 43, '37', 'Xám', 22, 'NIKE-43-37-1e2b5'),
(44, 44, '37', 'Đen', 38, 'NIKE-44-37-ffb57'),
(45, 45, '37', 'Vàng', 26, 'NIKE-45-37-536dc'),
(46, 46, '37', 'Vàng', 36, 'NIKE-46-37-62a6e'),
(47, 47, '37', 'Vàng', 10, 'NIKE-47-37-51c93'),
(48, 48, '37', 'Đen', 17, 'NIKE-48-37-7cfbe'),
(49, 49, '37', 'Trắng', 37, 'NIKE-49-37-8a5df'),
(50, 50, '37', 'Trắng', 33, 'NIKE-50-37-a3c9a'),
(51, 51, '37', 'Đỏ', 28, 'NIKE-51-37-0663e'),
(52, 52, '37', 'Đen', 21, 'NIKE-52-37-8b67c'),
(53, 53, '37', 'Vàng', 14, 'NIKE-53-37-7112e'),
(54, 54, '37', 'Đỏ', 19, 'NIKE-54-37-9a74c'),
(55, 55, '37', 'Đỏ', 23, 'NIKE-55-37-3c2bb'),
(56, 56, '37', 'Xám', 16, 'NIKE-56-37-9116d'),
(57, 57, '37', 'Xám', 30, 'NIKE-57-37-d6c36'),
(58, 58, '37', 'Xanh', 29, 'NIKE-58-37-198bb'),
(59, 59, '37', 'Trắng', 10, 'NIKE-59-37-3db27'),
(60, 60, '37', 'Đỏ', 26, 'NIKE-60-37-2c1f2'),
(61, 61, '37', 'Xám', 12, 'NIKE-61-37-e0182'),
(62, 62, '37', 'Xám', 17, 'NIKE-62-37-129e4'),
(63, 63, '37', 'Xanh', 27, 'NIKE-63-37-f85ae'),
(64, 64, '37', 'Trắng', 35, 'NIKE-64-37-22e60'),
(65, 65, '37', 'Đen', 10, 'NIKE-65-37-0ddb8'),
(66, 66, '37', 'Đen', 27, 'NIKE-66-37-3e7b5'),
(67, 67, '37', 'Vàng', 13, 'NIKE-67-37-0d999'),
(68, 68, '37', 'Trắng', 39, 'NIKE-68-37-170ec'),
(69, 69, '37', 'Trắng', 14, 'NIKE-69-37-15900'),
(70, 70, '37', 'Xanh', 27, 'NIKE-70-37-14b2f'),
(71, 71, '37', 'Vàng', 19, 'NIKE-71-37-f3855'),
(72, 72, '37', 'Vàng', 28, 'NIKE-72-37-3a989'),
(73, 73, '37', 'Trắng', 12, 'NIKE-73-37-28e90'),
(74, 74, '37', 'Xám', 35, 'NIKE-74-37-08aae'),
(75, 75, '37', 'Xám', 27, 'NIKE-75-37-73edf'),
(76, 76, '37', 'Trắng', 35, 'NIKE-76-37-58d8a'),
(77, 77, '37', 'Đỏ', 39, 'NIKE-77-37-075c2'),
(78, 78, '37', 'Vàng', 33, 'NIKE-78-37-e90fb'),
(79, 79, '37', 'Xám', 37, 'NIKE-79-37-d3030'),
(80, 80, '37', 'Vàng', 34, 'NIKE-80-37-79e60'),
(81, 81, '37', 'Trắng', 10, 'NIKE-81-37-af25f'),
(82, 82, '37', 'Trắng', 26, 'NIKE-82-37-3406a'),
(83, 83, '37', 'Trắng', 38, 'NIKE-83-37-8c4c2'),
(84, 84, '37', 'Vàng', 28, 'NIKE-84-37-04d80'),
(85, 85, '37', 'Xám', 34, 'NIKE-85-37-54276'),
(86, 86, '37', 'Xanh', 21, 'NIKE-86-37-520f9'),
(87, 87, '37', 'Đỏ', 27, 'NIKE-87-37-06065'),
(88, 88, '37', 'Xám', 22, 'NIKE-88-37-eb932'),
(89, 89, '37', 'Đen', 31, 'NIKE-89-37-33578'),
(90, 40, '38', 'Đen', 15, 'NIKE-40-38-5ee58'),
(91, 41, '38', 'Đen', 27, 'NIKE-41-38-cad81'),
(92, 42, '38', 'Xanh', 11, 'NIKE-42-38-51d0f'),
(93, 43, '38', 'Xám', 30, 'NIKE-43-38-35a7c'),
(94, 44, '38', 'Vàng', 39, 'NIKE-44-38-5d8e6'),
(95, 45, '38', 'Xám', 34, 'NIKE-45-38-89609'),
(96, 46, '38', 'Vàng', 28, 'NIKE-46-38-3abcb'),
(97, 47, '38', 'Xám', 15, 'NIKE-47-38-1e679'),
(98, 48, '38', 'Xanh', 36, 'NIKE-48-38-cc6db'),
(99, 49, '38', 'Đen', 18, 'NIKE-49-38-134fc'),
(100, 50, '38', 'Đen', 27, 'NIKE-50-38-163ef'),
(101, 51, '38', 'Đen', 24, 'NIKE-51-38-d7967'),
(102, 52, '38', 'Vàng', 32, 'NIKE-52-38-f7014'),
(103, 53, '38', 'Xanh', 22, 'NIKE-53-38-c9742'),
(104, 54, '38', 'Vàng', 26, 'NIKE-54-38-5f828'),
(105, 55, '38', 'Đỏ', 37, 'NIKE-55-38-06469'),
(106, 56, '38', 'Đen', 19, 'NIKE-56-38-a3fe3'),
(107, 57, '38', 'Xám', 23, 'NIKE-57-38-d40bd'),
(108, 58, '38', 'Đỏ', 19, 'NIKE-58-38-9ba5f'),
(109, 59, '38', 'Đen', 38, 'NIKE-59-38-b3e8e'),
(110, 60, '38', 'Đỏ', 36, 'NIKE-60-38-8c8d9'),
(111, 61, '38', 'Xám', 26, 'NIKE-61-38-9f857'),
(112, 62, '38', 'Vàng', 22, 'NIKE-62-38-dbfe8'),
(113, 63, '38', 'Vàng', 33, 'NIKE-63-38-09a41'),
(114, 64, '38', 'Xám', 33, 'NIKE-64-38-77126'),
(115, 65, '38', 'Xanh', 12, 'NIKE-65-38-a7a5e'),
(116, 66, '38', 'Xanh', 34, 'NIKE-66-38-faafd'),
(117, 67, '38', 'Đỏ', 11, 'NIKE-67-38-b1045'),
(118, 68, '38', 'Xám', 26, 'NIKE-68-38-e8e54'),
(119, 69, '38', 'Đỏ', 26, 'NIKE-69-38-7bfa8'),
(120, 70, '38', 'Xanh', 36, 'NIKE-70-38-40967'),
(121, 71, '38', 'Xanh', 10, 'NIKE-71-38-1ba36'),
(122, 72, '38', 'Đen', 37, 'NIKE-72-38-4d97a'),
(123, 73, '38', 'Xám', 22, 'NIKE-73-38-26e19'),
(124, 74, '38', 'Xám', 29, 'NIKE-74-38-c7b83'),
(125, 75, '38', 'Vàng', 39, 'NIKE-75-38-1a053'),
(126, 76, '38', 'Xanh', 26, 'NIKE-76-38-efa8d'),
(127, 77, '38', 'Trắng', 10, 'NIKE-77-38-4588b'),
(128, 78, '38', 'Đỏ', 21, 'NIKE-78-38-dde5e'),
(129, 79, '38', 'Vàng', 39, 'NIKE-79-38-ec654'),
(130, 80, '38', 'Trắng', 23, 'NIKE-80-38-70026'),
(131, 81, '38', 'Xám', 36, 'NIKE-81-38-792e0'),
(132, 82, '38', 'Xanh', 33, 'NIKE-82-38-7a056'),
(133, 83, '38', 'Đen', 37, 'NIKE-83-38-e39f1'),
(134, 84, '38', 'Trắng', 30, 'NIKE-84-38-35bf0'),
(135, 85, '38', 'Trắng', 33, 'NIKE-85-38-00f12'),
(136, 86, '38', 'Vàng', 17, 'NIKE-86-38-aac16'),
(137, 87, '38', 'Vàng', 10, 'NIKE-87-38-d24ae'),
(138, 88, '38', 'Vàng', 16, 'NIKE-88-38-33687'),
(139, 89, '38', 'Đỏ', 18, 'NIKE-89-38-35c76'),
(140, 40, '39', 'Xanh', 18, 'NIKE-40-39-0c3bb'),
(141, 41, '39', 'Xanh', 13, 'NIKE-41-39-eda21'),
(142, 42, '39', 'Xanh', 10, 'NIKE-42-39-272ce'),
(143, 43, '39', 'Vàng', 17, 'NIKE-43-39-d3938'),
(144, 44, '39', 'Trắng', 18, 'NIKE-44-39-c120b'),
(145, 45, '39', 'Trắng', 36, 'NIKE-45-39-d516f'),
(146, 46, '39', 'Đen', 21, 'NIKE-46-39-db8be'),
(147, 47, '39', 'Xanh', 33, 'NIKE-47-39-11594'),
(148, 48, '39', 'Xanh', 39, 'NIKE-48-39-98767'),
(149, 49, '39', 'Vàng', 10, 'NIKE-49-39-af626'),
(150, 50, '39', 'Xám', 12, 'NIKE-50-39-1a0ff'),
(151, 51, '39', 'Trắng', 18, 'NIKE-51-39-8147f'),
(152, 52, '39', 'Xanh', 12, 'NIKE-52-39-08b8f'),
(153, 53, '39', 'Đen', 28, 'NIKE-53-39-7f083'),
(154, 54, '39', 'Trắng', 29, 'NIKE-54-39-8eda6'),
(155, 55, '39', 'Trắng', 33, 'NIKE-55-39-6f52f'),
(156, 56, '39', 'Vàng', 32, 'NIKE-56-39-880da'),
(157, 57, '39', 'Trắng', 31, 'NIKE-57-39-a2e49'),
(158, 58, '39', 'Xám', 31, 'NIKE-58-39-85493'),
(159, 59, '39', 'Đen', 32, 'NIKE-59-39-49d18'),
(160, 60, '39', 'Xanh', 25, 'NIKE-60-39-0b105'),
(161, 61, '39', 'Xám', 13, 'NIKE-61-39-0050b'),
(162, 62, '39', 'Đen', 39, 'NIKE-62-39-71520'),
(163, 63, '39', 'Đỏ', 38, 'NIKE-63-39-0bc38'),
(164, 64, '39', 'Xám', 24, 'NIKE-64-39-2af27'),
(165, 65, '39', 'Xanh', 35, 'NIKE-65-39-3cf83'),
(166, 66, '39', 'Đỏ', 20, 'NIKE-66-39-28120'),
(167, 67, '39', 'Xám', 34, 'NIKE-67-39-78fab'),
(168, 68, '39', 'Đen', 33, 'NIKE-68-39-eebd7'),
(169, 69, '39', 'Xanh', 31, 'NIKE-69-39-f704f'),
(170, 70, '39', 'Vàng', 10, 'NIKE-70-39-37bc9'),
(171, 71, '39', 'Vàng', 28, 'NIKE-71-39-41649'),
(172, 72, '39', 'Vàng', 34, 'NIKE-72-39-4a921'),
(173, 73, '39', 'Trắng', 15, 'NIKE-73-39-a1081'),
(174, 74, '39', 'Xám', 30, 'NIKE-74-39-6e789'),
(175, 75, '39', 'Vàng', 20, 'NIKE-75-39-4e08c'),
(176, 76, '39', 'Xám', 38, 'NIKE-76-39-dce54'),
(177, 77, '39', 'Xanh', 20, 'NIKE-77-39-47cac'),
(178, 78, '39', 'Vàng', 23, 'NIKE-78-39-d2eda'),
(179, 79, '39', 'Đen', 38, 'NIKE-79-39-ee8cf'),
(180, 80, '39', 'Xám', 22, 'NIKE-80-39-ee911'),
(181, 81, '39', 'Đỏ', 26, 'NIKE-81-39-bef73'),
(182, 82, '39', 'Đỏ', 13, 'NIKE-82-39-662c9'),
(183, 83, '39', 'Trắng', 32, 'NIKE-83-39-85fda'),
(184, 84, '39', 'Xám', 21, 'NIKE-84-39-3c036'),
(185, 85, '39', 'Đỏ', 14, 'NIKE-85-39-fe598'),
(186, 86, '39', 'Đỏ', 25, 'NIKE-86-39-24b0b'),
(187, 87, '39', 'Vàng', 11, 'NIKE-87-39-106f1'),
(188, 88, '39', 'Xanh', 27, 'NIKE-88-39-db6f2'),
(189, 89, '39', 'Xám', 28, 'NIKE-89-39-0cc3a'),
(190, 40, '40', 'Xám', 25, 'NIKE-40-40-e0db9'),
(191, 41, '40', 'Vàng', 12, 'NIKE-41-40-ec9b8'),
(192, 42, '40', 'Vàng', 16, 'NIKE-42-40-47fe1'),
(193, 43, '40', 'Đỏ', 15, 'NIKE-43-40-1dcb4'),
(194, 44, '40', 'Trắng', 22, 'NIKE-44-40-09a12'),
(195, 45, '40', 'Vàng', 28, 'NIKE-45-40-0591f'),
(196, 46, '40', 'Xanh', 20, 'NIKE-46-40-739cb'),
(197, 47, '40', 'Xanh', 18, 'NIKE-47-40-b7b20'),
(198, 48, '40', 'Trắng', 12, 'NIKE-48-40-a1407'),
(199, 49, '40', 'Xanh', 25, 'NIKE-49-40-0863a'),
(200, 50, '40', 'Xám', 12, 'NIKE-50-40-ee5de'),
(201, 51, '40', 'Vàng', 23, 'NIKE-51-40-35176'),
(202, 52, '40', 'Trắng', 21, 'NIKE-52-40-ffad4'),
(203, 53, '40', 'Xanh', 36, 'NIKE-53-40-a490f'),
(204, 54, '40', 'Xanh', 37, 'NIKE-54-40-24d2b'),
(205, 55, '40', 'Xanh', 13, 'NIKE-55-40-9658c'),
(206, 56, '40', 'Đỏ', 34, 'NIKE-56-40-91e18'),
(207, 57, '40', 'Vàng', 11, 'NIKE-57-40-eb31f'),
(208, 58, '40', 'Trắng', 35, 'NIKE-58-40-03109'),
(209, 59, '40', 'Đen', 16, 'NIKE-59-40-c98e5'),
(210, 60, '40', 'Xám', 32, 'NIKE-60-40-46507'),
(211, 61, '40', 'Đen', 39, 'NIKE-61-40-e9910'),
(212, 62, '40', 'Đỏ', 19, 'NIKE-62-40-6e347'),
(213, 63, '40', 'Đỏ', 30, 'NIKE-63-40-36e87'),
(214, 64, '40', 'Đen', 18, 'NIKE-64-40-9d630'),
(215, 65, '40', 'Xanh', 27, 'NIKE-65-40-3a758'),
(216, 66, '40', 'Vàng', 35, 'NIKE-66-40-40b65'),
(217, 67, '40', 'Trắng', 31, 'NIKE-67-40-99d21'),
(218, 68, '40', 'Đen', 26, 'NIKE-68-40-d54ec'),
(219, 69, '40', 'Vàng', 21, 'NIKE-69-40-f0513'),
(220, 70, '40', 'Xám', 11, 'NIKE-70-40-92228'),
(221, 71, '40', 'Đỏ', 34, 'NIKE-71-40-ce4be'),
(222, 72, '40', 'Xanh', 33, 'NIKE-72-40-d19cb'),
(223, 73, '40', 'Đỏ', 15, 'NIKE-73-40-ee387'),
(224, 74, '40', 'Đen', 10, 'NIKE-74-40-b070b'),
(225, 75, '40', 'Vàng', 13, 'NIKE-75-40-f2899'),
(226, 76, '40', 'Vàng', 19, 'NIKE-76-40-d4e01'),
(227, 77, '40', 'Đỏ', 35, 'NIKE-77-40-e3726'),
(228, 78, '40', 'Đen', 17, 'NIKE-78-40-86224'),
(229, 79, '40', 'Xanh', 31, 'NIKE-79-40-1f58a'),
(230, 80, '40', 'Xám', 31, 'NIKE-80-40-d6cbe'),
(231, 81, '40', 'Đen', 11, 'NIKE-81-40-54fd7'),
(232, 82, '40', 'Vàng', 32, 'NIKE-82-40-af21a'),
(233, 83, '40', 'Đen', 35, 'NIKE-83-40-b07db'),
(234, 84, '40', 'Trắng', 15, 'NIKE-84-40-4ae00'),
(235, 85, '40', 'Xám', 31, 'NIKE-85-40-7a389'),
(236, 86, '40', 'Vàng', 36, 'NIKE-86-40-11f26'),
(237, 87, '40', 'Xanh', 11, 'NIKE-87-40-8e518'),
(238, 88, '40', 'Vàng', 36, 'NIKE-88-40-a2976'),
(239, 89, '40', 'Trắng', 39, 'NIKE-89-40-e71cf'),
(240, 40, '41', 'Trắng', 30, 'NIKE-40-41-ef12e'),
(241, 41, '41', 'Đen', 31, 'NIKE-41-41-0107c'),
(242, 42, '41', 'Xanh', 22, 'NIKE-42-41-fb06b'),
(243, 43, '41', 'Xanh', 29, 'NIKE-43-41-e3036'),
(244, 44, '41', 'Xanh', 21, 'NIKE-44-41-5d11c'),
(245, 45, '41', 'Xanh', 34, 'NIKE-45-41-13472'),
(246, 46, '41', 'Đỏ', 25, 'NIKE-46-41-fbade'),
(247, 47, '41', 'Xanh', 13, 'NIKE-47-41-90701'),
(248, 48, '41', 'Xám', 32, 'NIKE-48-41-dadfd'),
(249, 49, '41', 'Xanh', 11, 'NIKE-49-41-04556'),
(250, 50, '41', 'Xanh', 34, 'NIKE-50-41-57240'),
(251, 51, '41', 'Xanh', 37, 'NIKE-51-41-90e8d'),
(252, 52, '41', 'Đen', 15, 'NIKE-52-41-9482d'),
(253, 53, '41', 'Đỏ', 39, 'NIKE-53-41-cf281'),
(254, 54, '41', 'Vàng', 18, 'NIKE-54-41-1fc4b'),
(255, 55, '41', 'Xanh', 38, 'NIKE-55-41-bacaa'),
(256, 56, '41', 'Xanh', 25, 'NIKE-56-41-2d003'),
(257, 57, '41', 'Đen', 36, 'NIKE-57-41-8a501'),
(258, 58, '41', 'Trắng', 14, 'NIKE-58-41-90918'),
(259, 59, '41', 'Xám', 29, 'NIKE-59-41-403ae'),
(260, 60, '41', 'Trắng', 18, 'NIKE-60-41-f685b'),
(261, 61, '41', 'Đỏ', 21, 'NIKE-61-41-a3fdd'),
(262, 62, '41', 'Đỏ', 12, 'NIKE-62-41-ce457'),
(263, 63, '41', 'Vàng', 16, 'NIKE-63-41-fc3cf'),
(264, 64, '41', 'Đen', 19, 'NIKE-64-41-9e0f2'),
(265, 65, '41', 'Xanh', 31, 'NIKE-65-41-e5901'),
(266, 66, '41', 'Xám', 13, 'NIKE-66-41-8843a'),
(267, 67, '41', 'Đỏ', 20, 'NIKE-67-41-cbfe5'),
(268, 68, '41', 'Trắng', 14, 'NIKE-68-41-27e6a'),
(269, 69, '41', 'Đen', 14, 'NIKE-69-41-4edde'),
(270, 70, '41', 'Xám', 39, 'NIKE-70-41-c25e7'),
(271, 71, '41', 'Xanh', 24, 'NIKE-71-41-08826'),
(272, 72, '41', 'Xanh', 35, 'NIKE-72-41-f7210'),
(273, 73, '41', 'Vàng', 12, 'NIKE-73-41-22a13'),
(274, 74, '41', 'Đỏ', 33, 'NIKE-74-41-85a44'),
(275, 75, '41', 'Vàng', 30, 'NIKE-75-41-4122b'),
(276, 76, '41', 'Xám', 35, 'NIKE-76-41-74583'),
(277, 77, '41', 'Trắng', 16, 'NIKE-77-41-7d288'),
(278, 78, '41', 'Trắng', 27, 'NIKE-78-41-c620f'),
(279, 79, '41', 'Đen', 12, 'NIKE-79-41-684d2'),
(280, 80, '41', 'Xám', 22, 'NIKE-80-41-b1637'),
(281, 81, '41', 'Xám', 15, 'NIKE-81-41-c5d85'),
(282, 82, '41', 'Trắng', 29, 'NIKE-82-41-33e4e'),
(283, 83, '41', 'Xám', 39, 'NIKE-83-41-ccc47'),
(284, 84, '41', 'Trắng', 11, 'NIKE-84-41-ed26c'),
(285, 85, '41', 'Đen', 22, 'NIKE-85-41-60a6f'),
(286, 86, '41', 'Xanh', 13, 'NIKE-86-41-347bc'),
(287, 87, '41', 'Vàng', 23, 'NIKE-87-41-bf191'),
(288, 88, '41', 'Đỏ', 31, 'NIKE-88-41-e3049'),
(289, 89, '41', 'Xanh', 20, 'NIKE-89-41-4a84f'),
(290, 40, '42', 'Đen', 31, 'NIKE-40-42-12a68'),
(291, 41, '42', 'Vàng', 39, 'NIKE-41-42-e91fe'),
(292, 42, '42', 'Đen', 17, 'NIKE-42-42-31365'),
(293, 43, '42', 'Xanh', 26, 'NIKE-43-42-8479d'),
(294, 44, '42', 'Đỏ', 20, 'NIKE-44-42-07b6b'),
(295, 45, '42', 'Vàng', 39, 'NIKE-45-42-6bb4e'),
(296, 46, '42', 'Đỏ', 15, 'NIKE-46-42-24325'),
(297, 47, '42', 'Đen', 19, 'NIKE-47-42-1d1c1'),
(298, 48, '42', 'Xám', 39, 'NIKE-48-42-1994a'),
(299, 49, '42', 'Trắng', 18, 'NIKE-49-42-98344'),
(300, 50, '42', 'Xanh', 36, 'NIKE-50-42-2f190'),
(301, 51, '42', 'Đen', 11, 'NIKE-51-42-faa3c'),
(302, 52, '42', 'Xanh', 38, 'NIKE-52-42-b8be8'),
(303, 53, '42', 'Trắng', 30, 'NIKE-53-42-71307'),
(304, 54, '42', 'Vàng', 28, 'NIKE-54-42-99b49'),
(305, 55, '42', 'Đen', 22, 'NIKE-55-42-db74f'),
(306, 56, '42', 'Đen', 16, 'NIKE-56-42-4f29a'),
(307, 57, '42', 'Đỏ', 35, 'NIKE-57-42-e6783'),
(308, 58, '42', 'Đỏ', 16, 'NIKE-58-42-0986d'),
(309, 59, '42', 'Vàng', 30, 'NIKE-59-42-b4b91'),
(310, 60, '42', 'Trắng', 18, 'NIKE-60-42-91f6e'),
(311, 61, '42', 'Xanh', 18, 'NIKE-61-42-4246b'),
(312, 62, '42', 'Trắng', 32, 'NIKE-62-42-5d3ae'),
(313, 63, '42', 'Vàng', 38, 'NIKE-63-42-cffb1'),
(314, 64, '42', 'Trắng', 24, 'NIKE-64-42-09156'),
(315, 65, '42', 'Xám', 21, 'NIKE-65-42-dce29'),
(316, 66, '42', 'Đỏ', 24, 'NIKE-66-42-51560'),
(317, 67, '42', 'Xám', 31, 'NIKE-67-42-befd8'),
(318, 68, '42', 'Vàng', 20, 'NIKE-68-42-31f17'),
(319, 69, '42', 'Xanh', 39, 'NIKE-69-42-696a2'),
(320, 70, '42', 'Trắng', 24, 'NIKE-70-42-82c7b'),
(321, 71, '42', 'Vàng', 39, 'NIKE-71-42-e00d7'),
(322, 72, '42', 'Xám', 20, 'NIKE-72-42-40b4c'),
(323, 73, '42', 'Xanh', 36, 'NIKE-73-42-c38a7'),
(324, 74, '42', 'Trắng', 16, 'NIKE-74-42-c2025'),
(325, 75, '42', 'Trắng', 26, 'NIKE-75-42-cacf6'),
(326, 76, '42', 'Xanh', 24, 'NIKE-76-42-28f49'),
(327, 77, '42', 'Xám', 10, 'NIKE-77-42-1988a'),
(328, 78, '42', 'Trắng', 17, 'NIKE-78-42-af278'),
(329, 79, '42', 'Xanh', 38, 'NIKE-79-42-9cc86'),
(330, 80, '42', 'Đỏ', 32, 'NIKE-80-42-bcae7'),
(331, 81, '42', 'Đỏ', 17, 'NIKE-81-42-3f3cb'),
(332, 82, '42', 'Đen', 30, 'NIKE-82-42-0a44e'),
(333, 83, '42', 'Đen', 35, 'NIKE-83-42-aabf5'),
(334, 84, '42', 'Xám', 15, 'NIKE-84-42-4ec22'),
(335, 85, '42', 'Đỏ', 37, 'NIKE-85-42-e3888'),
(336, 86, '42', 'Đỏ', 15, 'NIKE-86-42-9ec78'),
(337, 87, '42', 'Xám', 35, 'NIKE-87-42-098b4'),
(338, 88, '42', 'Đen', 20, 'NIKE-88-42-edf2c'),
(339, 89, '42', 'Vàng', 10, 'NIKE-89-42-55d60'),
(340, 40, '43', 'Xám', 14, 'NIKE-40-43-60bed'),
(341, 41, '43', 'Trắng', 10, 'NIKE-41-43-97be0'),
(342, 42, '43', 'Đỏ', 34, 'NIKE-42-43-7cb73'),
(343, 43, '43', 'Đỏ', 17, 'NIKE-43-43-314b5'),
(344, 44, '43', 'Trắng', 36, 'NIKE-44-43-76c5f'),
(345, 45, '43', 'Đen', 30, 'NIKE-45-43-d7aaa'),
(346, 46, '43', 'Xám', 14, 'NIKE-46-43-ffc43'),
(347, 47, '43', 'Đen', 22, 'NIKE-47-43-bbf8b'),
(348, 48, '43', 'Xám', 23, 'NIKE-48-43-edc3d'),
(349, 49, '43', 'Đen', 12, 'NIKE-49-43-2eba4'),
(350, 50, '43', 'Trắng', 13, 'NIKE-50-43-a523d'),
(351, 51, '43', 'Đỏ', 19, 'NIKE-51-43-32ad9'),
(352, 52, '43', 'Xanh', 16, 'NIKE-52-43-9b40d'),
(353, 53, '43', 'Trắng', 13, 'NIKE-53-43-043fe'),
(354, 54, '43', 'Vàng', 30, 'NIKE-54-43-b0c4e'),
(355, 55, '43', 'Đỏ', 34, 'NIKE-55-43-461f9'),
(356, 56, '43', 'Xám', 11, 'NIKE-56-43-09046'),
(357, 57, '43', 'Vàng', 14, 'NIKE-57-43-33349'),
(358, 58, '43', 'Đen', 25, 'NIKE-58-43-a1869'),
(359, 59, '43', 'Trắng', 23, 'NIKE-59-43-54aa0'),
(360, 60, '43', 'Xám', 25, 'NIKE-60-43-8c4d2'),
(361, 61, '43', 'Đỏ', 12, 'NIKE-61-43-b90a7'),
(362, 62, '43', 'Vàng', 19, 'NIKE-62-43-c2f45'),
(363, 63, '43', 'Vàng', 35, 'NIKE-63-43-2ca35'),
(364, 64, '43', 'Đen', 18, 'NIKE-64-43-90022'),
(365, 65, '43', 'Xám', 10, 'NIKE-65-43-7f6ec'),
(366, 66, '43', 'Vàng', 24, 'NIKE-66-43-d922a'),
(367, 67, '43', 'Xám', 37, 'NIKE-67-43-b9da3'),
(368, 68, '43', 'Đen', 27, 'NIKE-68-43-35c72'),
(369, 69, '43', 'Vàng', 26, 'NIKE-69-43-75e81'),
(370, 70, '43', 'Xanh', 33, 'NIKE-70-43-c94f2'),
(371, 71, '43', 'Xanh', 26, 'NIKE-71-43-f59c3'),
(372, 72, '43', 'Xám', 15, 'NIKE-72-43-01ce7'),
(373, 73, '43', 'Đen', 13, 'NIKE-73-43-df946'),
(374, 74, '43', 'Vàng', 29, 'NIKE-74-43-ae046'),
(375, 75, '43', 'Đỏ', 17, 'NIKE-75-43-8312c'),
(376, 76, '43', 'Đen', 38, 'NIKE-76-43-35a5b'),
(377, 77, '43', 'Đỏ', 28, 'NIKE-77-43-f4a5d'),
(378, 78, '43', 'Đen', 21, 'NIKE-78-43-40214'),
(379, 79, '43', 'Đen', 10, 'NIKE-79-43-f6fa3'),
(380, 80, '43', 'Vàng', 11, 'NIKE-80-43-73013'),
(381, 81, '43', 'Đen', 19, 'NIKE-81-43-8ad00'),
(382, 82, '43', 'Đen', 21, 'NIKE-82-43-ba213'),
(383, 83, '43', 'Xanh', 38, 'NIKE-83-43-0088e'),
(384, 84, '43', 'Xám', 26, 'NIKE-84-43-2d374'),
(385, 85, '43', 'Trắng', 28, 'NIKE-85-43-30b82'),
(386, 86, '43', 'Xanh', 17, 'NIKE-86-43-292be'),
(387, 87, '43', 'Vàng', 16, 'NIKE-87-43-e2e65'),
(388, 88, '43', 'Đỏ', 36, 'NIKE-88-43-9a0ff'),
(389, 89, '43', 'Vàng', 30, 'NIKE-89-43-8f3a0'),
(390, 40, '44', 'Đen', 20, 'NIKE-40-44-b549d'),
(391, 41, '44', 'Xám', 24, 'NIKE-41-44-d0a56'),
(392, 42, '44', 'Trắng', 30, 'NIKE-42-44-f3490'),
(393, 43, '44', 'Xanh', 29, 'NIKE-43-44-64daf'),
(394, 44, '44', 'Xanh', 35, 'NIKE-44-44-6eb0f'),
(395, 45, '44', 'Đỏ', 25, 'NIKE-45-44-afbcd'),
(396, 46, '44', 'Vàng', 25, 'NIKE-46-44-bf7c2'),
(397, 47, '44', 'Xanh', 16, 'NIKE-47-44-453e9'),
(398, 48, '44', 'Trắng', 12, 'NIKE-48-44-ed80d'),
(399, 49, '44', 'Vàng', 19, 'NIKE-49-44-c4a2b'),
(400, 50, '44', 'Đen', 20, 'NIKE-50-44-ab890'),
(401, 51, '44', 'Đỏ', 22, 'NIKE-51-44-87653'),
(402, 52, '44', 'Đen', 24, 'NIKE-52-44-42380'),
(403, 53, '44', 'Xám', 21, 'NIKE-53-44-ef8e6'),
(404, 54, '44', 'Vàng', 26, 'NIKE-54-44-6b00f'),
(405, 55, '44', 'Đỏ', 23, 'NIKE-55-44-a026b'),
(406, 56, '44', 'Vàng', 38, 'NIKE-56-44-0642c'),
(407, 57, '44', 'Xanh', 11, 'NIKE-57-44-5ec05'),
(408, 58, '44', 'Trắng', 12, 'NIKE-58-44-134eb'),
(409, 59, '44', 'Đỏ', 29, 'NIKE-59-44-c37cd'),
(410, 60, '44', 'Xám', 15, 'NIKE-60-44-bed10'),
(411, 61, '44', 'Đen', 36, 'NIKE-61-44-8264f'),
(412, 62, '44', 'Đỏ', 37, 'NIKE-62-44-9d29d'),
(413, 63, '44', 'Xanh', 21, 'NIKE-63-44-4c341'),
(414, 64, '44', 'Đen', 19, 'NIKE-64-44-73043'),
(415, 65, '44', 'Trắng', 14, 'NIKE-65-44-6fc80'),
(416, 66, '44', 'Đen', 28, 'NIKE-66-44-e6664'),
(417, 67, '44', 'Đỏ', 14, 'NIKE-67-44-c86db'),
(418, 68, '44', 'Xám', 17, 'NIKE-68-44-385b3'),
(419, 69, '44', 'Xám', 34, 'NIKE-69-44-a0fae'),
(420, 70, '44', 'Xám', 33, 'NIKE-70-44-94621'),
(421, 71, '44', 'Xám', 26, 'NIKE-71-44-fe876'),
(422, 72, '44', 'Đen', 30, 'NIKE-72-44-6a155'),
(423, 73, '44', 'Đen', 20, 'NIKE-73-44-0d764'),
(424, 74, '44', 'Vàng', 26, 'NIKE-74-44-8e2dc'),
(425, 75, '44', 'Trắng', 13, 'NIKE-75-44-363a3'),
(426, 76, '44', 'Trắng', 22, 'NIKE-76-44-07283'),
(427, 77, '44', 'Đỏ', 14, 'NIKE-77-44-16b2e'),
(428, 78, '44', 'Xanh', 23, 'NIKE-78-44-7af03'),
(429, 79, '44', 'Đỏ', 33, 'NIKE-79-44-4e6f9'),
(430, 80, '44', 'Đen', 24, 'NIKE-80-44-4624f'),
(431, 81, '44', 'Xanh', 25, 'NIKE-81-44-8240e'),
(432, 82, '44', 'Xanh', 11, 'NIKE-82-44-33e88'),
(433, 83, '44', 'Xám', 30, 'NIKE-83-44-25d72'),
(434, 84, '44', 'Xám', 26, 'NIKE-84-44-a465b'),
(435, 85, '44', 'Đỏ', 10, 'NIKE-85-44-0d70d'),
(436, 86, '44', 'Trắng', 29, 'NIKE-86-44-9debc'),
(437, 87, '44', 'Xám', 36, 'NIKE-87-44-d0df5'),
(438, 88, '44', 'Đỏ', 32, 'NIKE-88-44-1b7fd'),
(439, 89, '44', 'Xám', 19, 'NIKE-89-44-ba5c4'),
(440, 40, '45', 'Đỏ', 35, 'NIKE-40-45-98740'),
(441, 41, '45', 'Đen', 11, 'NIKE-41-45-9fb15'),
(442, 42, '45', 'Xanh', 35, 'NIKE-42-45-51fa4'),
(443, 43, '45', 'Xanh', 12, 'NIKE-43-45-afc59'),
(444, 44, '45', 'Vàng', 19, 'NIKE-44-45-a45b0'),
(445, 45, '45', 'Xanh', 27, 'NIKE-45-45-c1fa9'),
(446, 46, '45', 'Xám', 37, 'NIKE-46-45-501aa'),
(447, 47, '45', 'Trắng', 13, 'NIKE-47-45-9f1ae'),
(448, 48, '45', 'Vàng', 28, 'NIKE-48-45-cd4a5'),
(449, 49, '45', 'Trắng', 26, 'NIKE-49-45-2f4fe'),
(450, 50, '45', 'Trắng', 37, 'NIKE-50-45-31cdc'),
(451, 51, '45', 'Vàng', 10, 'NIKE-51-45-ac932'),
(452, 52, '45', 'Đen', 36, 'NIKE-52-45-2d4cd'),
(453, 53, '45', 'Xám', 25, 'NIKE-53-45-e6851'),
(454, 54, '45', 'Đỏ', 37, 'NIKE-54-45-c5a8a'),
(455, 55, '45', 'Đỏ', 19, 'NIKE-55-45-ea185'),
(456, 56, '45', 'Trắng', 24, 'NIKE-56-45-e504d'),
(457, 57, '45', 'Vàng', 19, 'NIKE-57-45-92e98'),
(458, 58, '45', 'Đỏ', 11, 'NIKE-58-45-4d672'),
(459, 59, '45', 'Đỏ', 12, 'NIKE-59-45-7d82b'),
(460, 60, '45', 'Vàng', 27, 'NIKE-60-45-59640'),
(461, 61, '45', 'Trắng', 23, 'NIKE-61-45-fc59f'),
(462, 62, '45', 'Đen', 13, 'NIKE-62-45-233ac'),
(463, 63, '45', 'Đen', 27, 'NIKE-63-45-49f31'),
(464, 64, '45', 'Đen', 28, 'NIKE-64-45-1df9f'),
(465, 65, '45', 'Xanh', 19, 'NIKE-65-45-1e805'),
(466, 66, '45', 'Trắng', 33, 'NIKE-66-45-fdb9d'),
(467, 67, '45', 'Vàng', 10, 'NIKE-67-45-0f262'),
(468, 68, '45', 'Xanh', 24, 'NIKE-68-45-98284'),
(469, 69, '45', 'Trắng', 14, 'NIKE-69-45-d8c44'),
(470, 70, '45', 'Xám', 39, 'NIKE-70-45-8ed51'),
(471, 71, '45', 'Đỏ', 12, 'NIKE-71-45-ab610'),
(472, 72, '45', 'Vàng', 24, 'NIKE-72-45-d9063'),
(473, 73, '45', 'Xanh', 34, 'NIKE-73-45-8e576'),
(474, 74, '45', 'Xanh', 34, 'NIKE-74-45-6fff1'),
(475, 75, '45', 'Xanh', 36, 'NIKE-75-45-927ba'),
(476, 76, '45', 'Xanh', 15, 'NIKE-76-45-650eb'),
(477, 77, '45', 'Vàng', 12, 'NIKE-77-45-ba04a'),
(478, 78, '45', 'Trắng', 30, 'NIKE-78-45-a7a20'),
(479, 79, '45', 'Xanh', 19, 'NIKE-79-45-c62e6'),
(480, 80, '45', 'Đen', 18, 'NIKE-80-45-a18da'),
(481, 81, '45', 'Xanh', 10, 'NIKE-81-45-b0c01'),
(482, 82, '45', 'Trắng', 33, 'NIKE-82-45-27704'),
(483, 83, '45', 'Xanh', 25, 'NIKE-83-45-ae227'),
(484, 84, '45', 'Đỏ', 14, 'NIKE-84-45-3eb09'),
(485, 85, '45', 'Đen', 38, 'NIKE-85-45-bc8e1'),
(486, 86, '45', 'Xanh', 26, 'NIKE-86-45-88b43'),
(487, 87, '45', 'Xám', 39, 'NIKE-87-45-ad39e'),
(488, 88, '45', 'Trắng', 39, 'NIKE-88-45-f44d2'),
(489, 89, '45', 'Trắng', 35, 'NIKE-89-45-f92ea'),
(490, 43, '46', 'Vàng', 20, 'nike-40-46-e123112'),
(491, 43, '47', 'Vàng', 10, 'nike-40-46-e13413N32');

INSERT INTO "public"."products" ("id", "name", "slug", "description", "price", "category_id", "brand", "gender", "attributes", "created_at") VALUES
(1, 'Adidas UltraBoost 22', 'ultraboost-22', 'Giày chạy bộ hiệu năng cao', 3500000.00, 1, 'Adidas', 'unisex', '{"origin": "Vietnam", "material": "vải"}', '2025-09-17 06:43:36.372924'),
(2, 'Áo thể thao nam Adidas', 'ao-nam-adidas', 'Áo thể thao thoáng khí', 650000.00, 2, 'Adidas', 'male', '{"material": "polyester"}', '2025-09-17 06:43:36.372924'),
(5, 'Quần thể thao nữ Nike', 'quan-nu-adidas', 'Quần thể thao nữ phù hợp đi tập gym và chơi thể thao', 8500000.00, 2, 'Nike', 'Female', '{"material": "polyester"}', '2025-09-17 06:43:36.372'),
(7, 'Quần thể thao nữ Nike kiểu mới', 'quan-nu-nike', 'Quần thể thao nữ phù hợp đi tập gym và chơi thể thao cc', 1000000.00, 2, 'Nike', 'Female', '{"material": "polyester"}', '2025-09-17 06:43:36.372'),
(8, 'Quần thể thao nữ Nike', 'quan-nam-nike', 'Quần thể thao nữ phù hợp đi tập gym và chơi thể thao', 8500000.00, 2, 'Nike', 'Female', '{"material": "polyester"}', '2025-09-17 06:43:36.372'),
(10, 'Nike Air Zoom Pegasus 41', 'nike-air-zoom-pegasus-41', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái.', 3590000.00, 3, 'Nike', 'Unisex', '{"size": ["39", "40", "41", "42", "43"], "color": "Trắng/Xanh", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(11, 'Nike Invincible 3', 'nike-invincible-3', 'Đôi giày chạy bộ tối đa êm ái với công nghệ ZoomX foam cho cảm giác đàn hồi vượt trội.', 4890000.00, 3, 'Nike', 'Nam', '{"size": ["40", "41", "42", "43"], "color": "Đen/Trắng", "material": "Flyknit"}', '2025-11-05 10:04:58.002268'),
(12, 'Nike Vaporfly 3', 'nike-vaporfly-3', 'Thiết kế dành cho vận động viên chuyên nghiệp, nhẹ và tốc độ vượt trội.', 7290000.00, 3, 'Nike', 'Unisex', '{"size": ["39", "40", "41", "42"], "color": "Hồng/Trắng", "material": "Engineered Mesh"}', '2025-11-05 10:04:58.002268'),
(13, 'Air Jordan 1 Mid', 'air-jordan-1-mid', 'Mẫu giày bóng rổ huyền thoại kết hợp phong cách cổ điển và hiện đại.', 3990000.00, 4, 'Jordan', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Đỏ/Đen/Trắng", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(14, 'LeBron 21', 'lebron-21', 'Giày bóng rổ cao cấp mang tên huyền thoại LeBron James, hỗ trợ tối đa độ bám và bật nhảy.', 5390000.00, 4, 'Nike', 'Nam', '{"size": ["40", "41", "42", "43"], "color": "Tím/Vàng", "material": "Knit"}', '2025-11-05 10:04:58.002268'),
(15, 'Nike Air Force 1', 'nike-air-force-1', 'Biểu tượng sneaker cổ điển của Nike, phong cách đường phố bất hủ.', 2990000.00, 5, 'Nike', 'Unisex', '{"size": ["36", "37", "38", "39", "40", "41", "42"], "color": "Trắng", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(16, 'Nike Dunk Low Panda', 'nike-dunk-low-panda', 'Sneaker thời trang với phối màu đen trắng huyền thoại, dễ phối đồ.', 3190000.00, 5, 'Nike', 'Unisex', '{"size": ["36", "37", "38", "39", "40", "41"], "color": "Đen/Trắng", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(17, 'Nike Blazer Mid 77 Vintage', 'nike-blazer-mid-77-vintage', 'Sneaker retro cổ điển mang đậm tinh thần thập niên 70.', 2890000.00, 5, 'Nike', 'Nam', '{"size": ["39", "40", "41", "42"], "color": "Trắng/Sọc Xanh", "material": "Suede"}', '2025-11-05 10:04:58.002268'),
(18, 'Nike Dri-FIT Tee', 'nike-dri-fit-tee', 'Áo thun thể thao Nike Dri-FIT thoáng khí, khô nhanh khi vận động.', 890000.00, 6, 'Nike', 'Nam', '{"size": ["S", "M", "L", "XL"], "color": "Đen", "material": "Polyester"}', '2025-11-05 10:04:58.002268'),
(19, 'Nike Tech Fleece Hoodie', 'nike-tech-fleece-hoodie', 'Áo hoodie Tech Fleece sang trọng, nhẹ và giữ ấm tốt.', 2590000.00, 6, 'Nike', 'Nam', '{"size": ["S", "M", "L", "XL"], "color": "Xám", "material": "Fleece"}', '2025-11-05 10:04:58.002268'),
(20, 'Nike Sportswear Club Joggers', 'nike-sportswear-club-joggers', 'Quần jogger thể thao thoải mái, phù hợp cho tập luyện và mặc thường ngày.', 1490000.00, 6, 'Nike', 'Nam', '{"size": ["S", "M", "L", "XL"], "color": "Đen", "material": "Cotton Blend"}', '2025-11-05 10:04:58.002268'),
(21, 'Nike Yoga Luxe Leggings', 'nike-yoga-luxe-leggings', 'Quần legging co giãn cao cấp dành cho yoga và gym.', 1390000.00, 7, 'Nike', 'Nữ', '{"size": ["S", "M", "L"], "color": "Tím", "material": "Spandex"}', '2025-11-05 10:04:58.002268'),
(22, 'Nike One Mid-Rise Tight', 'nike-one-mid-rise-tight', 'Quần thể thao nữ co giãn, ôm sát cơ thể, mang lại sự thoải mái.', 1190000.00, 7, 'Nike', 'Nữ', '{"size": ["S", "M", "L", "XL"], "color": "Đen", "material": "Polyester"}', '2025-11-05 10:04:58.002268'),
(23, 'Nike Pro Crop Top', 'nike-pro-crop-top', 'Áo crop top thể thao năng động, thoáng khí.', 790000.00, 7, 'Nike', 'Nữ', '{"size": ["S", "M", "L"], "color": "Trắng", "material": "Cotton/Spandex"}', '2025-11-05 10:04:58.002268'),
(24, 'Nike Heritage Backpack', 'nike-heritage-backpack', 'Balo Heritage cổ điển với ngăn lớn và logo Nike nổi bật.', 999000.00, 8, 'Nike', 'Unisex', '{"color": "Đen", "material": "Polyester"}', '2025-11-05 10:04:58.002268'),
(25, 'Nike Brasilia Duffel Bag', 'nike-brasilia-duffel-bag', 'Túi thể thao duffel rộng rãi, tiện lợi cho gym hoặc du lịch.', 1190000.00, 8, 'Nike', 'Unisex', '{"color": "Xám", "material": "Nylon"}', '2025-11-05 10:04:58.002268'),
(26, 'Nike Everyday Cushioned Socks (3 Pairs)', 'nike-everyday-cushioned-socks', 'Bộ 3 đôi vớ thể thao mềm mại và thoáng khí.', 390000.00, 8, 'Nike', 'Unisex', '{"color": "Trắng", "material": "Cotton"}', '2025-11-05 10:04:58.002268'),
(27, 'Nike Revolution 6 Kids', 'nike-revolution-6-kids', 'Giày chạy bộ cho trẻ em, nhẹ, bền và linh hoạt.', 1290000.00, 9, 'Nike', 'Unisex', '{"size": ["30", "31", "32", "33"], "color": "Xanh Dương", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(28, 'Nike Air Max 270 Kids', 'nike-air-max-270-kids', 'Giày lifestyle cho trẻ em với đế Air Max êm ái và thời trang.', 1990000.00, 9, 'Nike', 'Unisex', '{"size": ["31", "32", "33", "34"], "color": "Hồng/Trắng", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(29, 'Jordan Kids Hoodie', 'jordan-kids-hoodie', 'Áo hoodie Jordan dành cho trẻ em, ấm áp và phong cách.', 1190000.00, 9, 'Jordan', 'Unisex', '{"size": ["S", "M", "L"], "color": "Đen/Đỏ", "material": "Cotton Fleece"}', '2025-11-05 10:04:58.002268'),
(30, 'Air Jordan 1 Retro High OG', 'air-jordan-1-retro-high-og', 'Phiên bản OG mang tính biểu tượng của Jordan, thiết kế đỉnh cao cho cả chơi và sưu tầm.', 5490000.00, 10, 'Jordan', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Đỏ/Đen", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(31, 'Air Jordan XXXVIII Low', 'air-jordan-xxxviii-low', 'Công nghệ Zoom Strobel và thiết kế nhẹ hỗ trợ bật nhảy cực tốt.', 5390000.00, 10, 'Jordan', 'Nam', '{"size": ["39", "40", "41", "42"], "color": "Trắng/Xanh", "material": "Knit"}', '2025-11-05 10:04:58.002268'),
(32, 'Nike Air Max 90', 'nike-air-max-90', 'Thiết kế huyền thoại Air Max 90 với phong cách retro hiện đại.', 3690000.00, 11, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Trắng/Xám/Đỏ", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(33, 'Nike Air Max 270', 'nike-air-max-270', 'Giày Air Max cổ thấp mang lại cảm giác thoải mái và phong cách thời thượng.', 3890000.00, 11, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Đen/Trắng", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(34, 'Nike Air Max Plus', 'nike-air-max-plus', 'Đôi giày nổi bật với thiết kế “cánh sóng” đặc trưng và đệm Air toàn phần.', 4590000.00, 11, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Cam/Đen", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(35, 'Nike Court Vision Low', 'nike-court-vision-low', 'Sneaker cổ thấp cảm hứng từ bóng rổ thập niên 80.', 2490000.00, 5, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Trắng/Đen", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(36, 'Nike Air Monarch IV', 'nike-air-monarch-iv', 'Giày training đa năng, bền bỉ, phù hợp mọi hoạt động thể thao.', 2290000.00, 1, 'Nike', 'Nam', '{"size": ["40", "41", "42", "43"], "color": "Trắng/Xanh Navy", "material": "Leather"}', '2025-11-05 10:04:58.002268'),
(37, 'Nike SB Dunk Low Pro', 'nike-sb-dunk-low-pro', 'Giày trượt ván phong cách retro với đệm Zoom Air ở gót.', 3490000.00, 5, 'Nike', 'Nam', '{"size": ["39", "40", "41", "42"], "color": "Xanh Navy/Trắng", "material": "Suede"}', '2025-11-05 10:04:58.002268'),
(38, 'Nike Air Max 97', 'nike-air-max-97', 'Thiết kế biểu tượng với các đường cong khí động học và đệm Air toàn bộ.', 4590000.00, 11, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42"], "color": "Bạc/Trắng", "material": "Mesh"}', '2025-11-05 10:04:58.002268'),
(39, 'Nike Zoom Freak 5', 'nike-zoom-freak-5', 'Giày bóng rổ của Giannis Antetokounmpo với đệm Zoom và trọng lượng nhẹ.', 4290000.00, 4, 'Nike', 'Nam', '{"size": ["39", "40", "41", "42"], "color": "Trắng/Xanh Lá", "material": "Knit"}', '2025-11-05 10:04:58.002268'),
(40, 'Nike Air Zoom Pegasus 1', 'nike-air-zoom-pegasus-1-3448', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2666636.14, 3, 'Saucony', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Mesh"}', '2025-10-31 01:08:06.766595'),
(41, 'Nike Air Zoom Pegasus 2', 'nike-air-zoom-pegasus-2-7729', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3743904.70, 3, 'Adidas', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Flyknit"}', '2025-10-17 04:57:42.259469'),
(42, 'Nike Air Zoom Pegasus 3', 'nike-air-zoom-pegasus-3-3488', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2863983.81, 3, 'Asics', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Flyknit"}', '2025-10-24 15:49:32.063877'),
(43, 'Nike Air Zoom Pegasus 4', 'nike-air-zoom-pegasus-4-3590', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3502160.77, 3, 'Asics', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Synthetic"}', '2025-10-28 03:03:05.803301'),
(44, 'Nike Air Zoom Pegasus 5', 'nike-air-zoom-pegasus-5-2923', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3590300.48, 3, 'Nike', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Mesh"}', '2025-10-15 10:12:47.253247'),
(45, 'Nike Air Zoom Pegasus 6', 'nike-air-zoom-pegasus-6-405', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3298178.07, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Mesh"}', '2025-11-03 04:07:58.094843'),
(46, 'Nike Air Zoom Pegasus 7', 'nike-air-zoom-pegasus-7-1528', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2974180.50, 3, 'Saucony', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Synthetic"}', '2025-10-12 10:42:37.348877'),
(47, 'Nike Air Zoom Pegasus 8', 'nike-air-zoom-pegasus-8-1442', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4227534.06, 3, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Synthetic"}', '2025-09-30 20:28:51.90597'),
(48, 'Nike Air Zoom Pegasus 9', 'nike-air-zoom-pegasus-9-3722', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4411743.02, 3, 'Saucony', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Flyknit"}', '2025-09-10 12:42:44.063692'),
(49, 'Nike Air Zoom Pegasus 10', 'nike-air-zoom-pegasus-10-3820', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3973604.54, 3, 'New Balance', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Synthetic"}', '2025-09-20 02:22:23.826877'),
(50, 'Nike Air Zoom Pegasus 11', 'nike-air-zoom-pegasus-11-5067', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3250006.49, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Leather"}', '2025-09-17 01:35:03.109927'),
(51, 'Nike Air Zoom Pegasus 12', 'nike-air-zoom-pegasus-12-1689', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2786958.09, 3, 'Saucony', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Flyknit"}', '2025-09-20 11:36:20.89904'),
(52, 'Nike Air Zoom Pegasus 13', 'nike-air-zoom-pegasus-13-316', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3037185.88, 3, 'Asics', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Synthetic"}', '2025-09-14 17:03:04.343758'),
(53, 'Nike Air Zoom Pegasus 14', 'nike-air-zoom-pegasus-14-4211', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3996213.34, 3, 'Adidas', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Flyknit"}', '2025-10-29 03:51:58.581856'),
(54, 'Nike Air Zoom Pegasus 15', 'nike-air-zoom-pegasus-15-334', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3348017.21, 3, 'New Balance', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Leather"}', '2025-10-14 19:16:46.229193'),
(55, 'Nike Air Zoom Pegasus 16', 'nike-air-zoom-pegasus-16-2257', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2689481.39, 3, 'Nike', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đỏ", "material": "Mesh"}', '2025-10-03 18:19:09.269941'),
(56, 'Nike Air Zoom Pegasus 17', 'nike-air-zoom-pegasus-17-4516', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3802268.80, 3, 'New Balance', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Mesh"}', '2025-11-04 00:32:26.835197'),
(57, 'Nike Air Zoom Pegasus 18', 'nike-air-zoom-pegasus-18-2889', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3555188.66, 3, 'Puma', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Mesh"}', '2025-09-27 16:00:05.358184'),
(58, 'Nike Air Zoom Pegasus 19', 'nike-air-zoom-pegasus-19-2331', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2752415.57, 3, 'Puma', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Mesh"}', '2025-10-16 01:17:34.15052'),
(59, 'Nike Air Zoom Pegasus 20', 'nike-air-zoom-pegasus-20-2923', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2827468.56, 3, 'Puma', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Leather"}', '2025-11-01 03:12:23.810778'),
(60, 'Nike Air Zoom Pegasus 21', 'nike-air-zoom-pegasus-21-9318', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2866825.18, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Synthetic"}', '2025-10-13 14:45:41.641476'),
(61, 'Nike Air Zoom Pegasus 22', 'nike-air-zoom-pegasus-22-9851', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4449906.81, 3, 'Puma', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đỏ", "material": "Mesh"}', '2025-10-13 23:49:21.941397'),
(62, 'Nike Air Zoom Pegasus 23', 'nike-air-zoom-pegasus-23-4406', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3290035.61, 3, 'Adidas', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Synthetic"}', '2025-10-20 17:47:04.860953'),
(63, 'Nike Air Zoom Pegasus 24', 'nike-air-zoom-pegasus-24-5048', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2640280.04, 3, 'New Balance', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Leather"}', '2025-11-01 04:37:17.32672'),
(64, 'Nike Air Zoom Pegasus 25', 'nike-air-zoom-pegasus-25-7002', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2522461.21, 3, 'New Balance', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Mesh"}', '2025-09-20 19:40:37.805724'),
(65, 'Nike Air Zoom Pegasus 26', 'nike-air-zoom-pegasus-26-3085', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3953148.39, 3, 'New Balance', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Mesh"}', '2025-11-01 06:56:50.479115'),
(66, 'Nike Air Zoom Pegasus 27', 'nike-air-zoom-pegasus-27-9339', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3906179.07, 3, 'Adidas', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Mesh"}', '2025-09-14 12:38:21.426649'),
(67, 'Nike Air Zoom Pegasus 28', 'nike-air-zoom-pegasus-28-5886', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4391512.46, 3, 'Saucony', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Mesh"}', '2025-09-21 22:35:53.259358'),
(68, 'Nike Air Zoom Pegasus 29', 'nike-air-zoom-pegasus-29-1103', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2856261.67, 3, 'Nike', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Mesh"}', '2025-10-03 04:05:35.119149'),
(69, 'Nike Air Zoom Pegasus 30', 'nike-air-zoom-pegasus-30-6142', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4347387.94, 3, 'Saucony', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Flyknit"}', '2025-10-21 02:20:57.086967'),
(70, 'Nike Air Zoom Pegasus 31', 'nike-air-zoom-pegasus-31-8893', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3741645.38, 3, 'New Balance', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Leather"}', '2025-10-20 08:34:38.474105'),
(71, 'Nike Air Zoom Pegasus 32', 'nike-air-zoom-pegasus-32-7457', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3959063.33, 3, 'New Balance', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Synthetic"}', '2025-11-06 05:35:18.805551'),
(72, 'Nike Air Zoom Pegasus 33', 'nike-air-zoom-pegasus-33-1975', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3861835.86, 3, 'Saucony', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Leather"}', '2025-10-29 01:52:54.025188'),
(73, 'Nike Air Zoom Pegasus 34', 'nike-air-zoom-pegasus-34-2597', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3354754.64, 3, 'Asics', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Leather"}', '2025-10-16 19:08:59.731114'),
(74, 'Nike Air Zoom Pegasus 35', 'nike-air-zoom-pegasus-35-2556', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4132844.43, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Synthetic"}', '2025-09-25 11:27:26.467096'),
(75, 'Nike Air Zoom Pegasus 36', 'nike-air-zoom-pegasus-36-5409', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3381618.04, 3, 'Puma', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Mesh"}', '2025-10-07 15:45:09.922769'),
(76, 'Nike Air Zoom Pegasus 37', 'nike-air-zoom-pegasus-37-3643', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3922145.58, 3, 'Nike', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Synthetic"}', '2025-11-02 00:27:27.571189'),
(77, 'Nike Air Zoom Pegasus 38', 'nike-air-zoom-pegasus-38-5295', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3231376.02, 3, 'New Balance', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Leather"}', '2025-09-17 03:05:01.884538'),
(78, 'Nike Air Zoom Pegasus 39', 'nike-air-zoom-pegasus-39-2830', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3325758.24, 3, 'New Balance', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Mesh"}', '2025-11-02 22:56:34.459114'),
(79, 'Nike Air Zoom Pegasus 40', 'nike-air-zoom-pegasus-40-8498', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4413696.27, 3, 'New Balance', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Synthetic"}', '2025-10-01 12:28:21.809825'),
(80, 'Nike Air Zoom Pegasus 41', 'nike-air-zoom-pegasus-41-3534', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3505500.17, 3, 'Saucony', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Mesh"}', '2025-10-13 06:20:14.153332'),
(81, 'Nike Air Zoom Pegasus 42', 'nike-air-zoom-pegasus-42-7404', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 4138193.10, 3, 'Saucony', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Leather"}', '2025-11-01 07:41:45.307578'),
(82, 'Nike Air Zoom Pegasus 43', 'nike-air-zoom-pegasus-43-7624', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2848848.84, 3, 'Puma', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Trắng", "material": "Synthetic"}', '2025-10-05 06:27:47.873247'),
(83, 'Nike Air Zoom Pegasus 44', 'nike-air-zoom-pegasus-44-2846', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3077408.82, 3, 'New Balance', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Leather"}', '2025-10-18 20:03:23.384665'),
(84, 'Nike Air Zoom Pegasus 45', 'nike-air-zoom-pegasus-45-1511', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3542874.38, 3, 'Saucony', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Leather"}', '2025-09-13 14:13:41.094171'),
(85, 'Nike Air Zoom Pegasus 46', 'nike-air-zoom-pegasus-46-3473', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3373920.49, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Vàng", "material": "Flyknit"}', '2025-10-21 02:51:42.304658'),
(86, 'Nike Air Zoom Pegasus 47', 'nike-air-zoom-pegasus-47-9418', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3494259.59, 3, 'New Balance', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xanh", "material": "Mesh"}', '2025-09-25 09:29:51.797844'),
(87, 'Nike Air Zoom Pegasus 48', 'nike-air-zoom-pegasus-48-7664', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3012757.25, 3, 'Adidas', 'Women', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Xám", "material": "Leather"}', '2025-10-30 03:57:58.834411'),
(88, 'Nike Air Zoom Pegasus 49', 'nike-air-zoom-pegasus-49-1325', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 2968057.77, 3, 'Nike', 'Men', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Leather"}', '2025-09-17 10:48:44.765846'),
(89, 'Nike Air Zoom Pegasus 50', 'nike-air-zoom-pegasus-50-8214', 'Giày chạy bộ hiệu năng cao với đệm Zoom Air giúp tăng độ đàn hồi và thoải mái khi di chuyển.', 3599623.75, 3, 'Adidas', 'Unisex', '{"size": ["38", "39", "40", "41", "42", "43", "44"], "color": "Đen", "material": "Flyknit"}', '2025-10-22 18:16:29.96951');

INSERT INTO "public"."product_images" ("id", "product_id", "image_url", "alt_text") VALUES
(1, 10, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/8e3bf53a-6613-4d1c-b838-b85623674d1b/NIKE+AVA+ROVER.png', 'Nike Ava Rover'),
(2, 11, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/012a91ce-8601-44df-bc76-e98718a414b3/NIKE+SHOX+RIDE+2.png', 'Nike Shox Ride 2'),
(3, 12, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/5bd30c3e-63e8-4ac8-862a-ff141ab37e72/AIR+MAX+TL+2.5.png', 'Nike Air Max TL 2.5'),
(4, 13, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/4cde9042-7bbf-4bc3-9870-2891c27e7888/AIR+FORCE+1+GTX.png', 'Nike Air Force 1 GTX'),
(5, 14, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/692cdb67-6709-4e93-953d-e6157edc3b13/AIR+FORCE+1+%2707.png', 'Nike Air Force 1 07'),
(6, 15, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/c90f7949-b685-485e-8602-23f1d079cd3a/AIR+FORCE+1+%2707+WB.png', 'Nike Air Force 1 07 WB'),
(7, 16, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/d9eaab9f-5089-47b5-9095-df566497c83e/NIKE+DUNK+LOW+RETRO+LTD+HWN.png', 'Nike Dunk Low Retro LTD HWN'),
(8, 17, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/4ffaaac5-a2e5-4d34-8955-84094bcc9185/NIKE+SHOX+RIDE+2+PRM.png', 'Nike Shox Ride 2 PRM'),
(9, 18, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/339cc390-4fcc-4b89-86be-0d296649fe4a/TOTAL+90.png', 'Nike Total 90'),
(10, 19, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/b28ec80a-e46e-4e2e-9a5e-3137cbb48160/NIKE+CORTEZ+SE.png', 'Nike Cortez SE'),
(11, 20, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/7d944533-8894-4d75-bda2-2f7f8565ebaa/KILLSHOT+2+PRM.png', 'Nike Killshot 2 PRM'),
(12, 21, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/e34f45c2-765d-4cdb-b3bf-7599b664ec0b/NIKE+C1TY+PRM.png', 'Nike C1TY PRM'),
(13, 22, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/disuwww5uxkqulu2aivh/AIR+MAX+PLUS+III.png', 'Nike Air Max Plus III'),
(14, 23, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/xa3j5pmlqu9lz6y1xbsb/NIKE+SHOX+TL.png', 'Nike Shox TL'),
(15, 24, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/174e5786-2ecc-4b6c-bc0e-32f2d95b26e1/KILLSHOT+2+PRM.png', 'Nike Killshot 2 PRM (Variant)'),
(16, 25, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/f359f330-b2f1-4875-9cb2-0820339dae6d/AIR+JORDAN+1+LOW+SE.png', 'Air Jordan 1 Low SE'),
(17, 26, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/ac07bbe2-62e0-406f-a6c6-8879ba277d54/NIKE+CORTEZ+SE.png', 'Nike Cortez SE (White)'),
(18, 27, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/370895ab-d64a-4d3b-a10d-3114a8bc2849/NIKE+AIR+MAX+PLUS+VII.png', 'Nike Air Max Plus VII'),
(19, 28, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/64f6a4e1-112a-468e-9a64-fad823e40e70/NIKE+AIR+MAX+MOTO+2K.png', 'Nike Air Max Moto 2K'),
(81, 5, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/d9eaab9f-5089-47b5-9095-df566497c83e/NIKE+DUNK+LOW+RETRO+LTD+HWN.png', 'Nike Dunk Low Retro – giày thể thao cổ thấp phong cách cổ điển'),
(82, 5, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/4ffaaac5-a2e5-4d34-8955-84094bcc9185/NIKE+SHOX+RIDE+2+PRM.png', 'Nike Shox Ride 2 PRM – giày chạy bộ đệm lò xo độc đáo'),
(83, 2, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/339cc390-4fcc-4b89-86be-0d296649fe4a/TOTAL+90.png', 'Nike Total 90 – giày bóng đá huyền thoại của Nike'),
(84, 1, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/b28ec80a-e46e-4e2e-9a5e-3137cbb48160/NIKE+CORTEZ+SE.png', 'Nike Cortez SE – thiết kế retro nhẹ và thoải mái'),
(85, 7, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/7d944533-8894-4d75-bda2-2f7f8565ebaa/KILLSHOT+2+PRM.png', 'Nike Killshot 2 Premium – giày casual da lộn thời trang'),
(86, 8, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/27088074-6530-425a-96e1-d75671cd5b1c/NIKE+AIR+MAX+1+%2786+OG+G.png', 'Nike Air Max 1 OG – biểu tượng của dòng Air Max'),
(87, 7, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/29a39b77-7adc-4750-a6c7-f1e8cd3ea30f/NIKE+AIR+MAX+PLUS+VII.png', 'Nike Air Max Plus VII – thiết kế mạnh mẽ, đệm khí êm ái'),
(88, 7, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/disuwww5uxkqulu2aivh/AIR+MAX+PLUS+III.png', 'Nike Air Max Plus III – phong cách thể thao tương lai'),
(89, 1, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/xa3j5pmlqu9lz6y1xbsb/NIKE+SHOX+TL.png', 'Nike Shox TL – giày thể thao hiệu năng cao với đế lò xo'),
(90, 5, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/47abb75c-4df6-4379-adae-9ff2dcfc9e9f/NIKE+SHOX+RIDE+2.png', 'Nike Shox Ride 2 – phong cách thể thao cổ điển'),
(91, 8, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/6f1bc07f-e014-400b-896d-97fc0b0457bf/NIKE+AVA+ROVER.png', 'Nike Ava Rover – giày thời trang năng động'),
(92, 2, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/064e576c-3dcc-4399-b218-bf52e3b965d3/KILLSHOT+2+LTR+PRM.png', 'Nike Killshot 2 LTR Premium – phong cách tối giản cao cấp'),
(93, 7, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/02ee4642-a89d-4ba0-931d-6a32ca8aadab/NIKE+P-6000+SE.png', 'Nike P-6000 SE – giày chạy bộ retro với lưới thoáng khí'),
(94, 7, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/174e5786-2ecc-4b6c-bc0e-32f2d95b26e1/KILLSHOT+2+PRM.png', 'Nike Killshot 2 Premium – phong cách vintage độc đáo'),
(95, 1, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/8d776c04-a43f-4bb4-8b65-088669a7f8e5/NIKE+AIR+FORCE+1+%2707+LV8.png', 'Nike Air Force 1 LV8 – biểu tượng streetwear bền bỉ'),
(96, 5, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/u_126ab356-44d8-4a06-89b4-fcdcc8df0245,c_scale,fl_relative,w_1.0,h_1.0,fl_layer_apply/f359f330-b2f1-4875-9cb2-0820339dae6d/AIR+JORDAN+1+LOW+SE.png', 'Air Jordan 1 Low SE – giày sneaker huyền thoại'),
(97, 8, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/ac07bbe2-62e0-406f-a6c6-8879ba277d54/NIKE+CORTEZ+SE.png', 'Nike Cortez SE – phiên bản đặc biệt mang hơi hướng cổ điển'),
(98, 5, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/370895ab-d64a-4d3b-a10d-3114a8bc2849/NIKE+AIR+MAX+PLUS+VII.png', 'Nike Air Max Plus VII – phối màu mạnh mẽ, phong cách hiện đại'),
(99, 2, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/64f6a4e1-112a-468e-9a64-fad823e40e70/NIKE+AIR+MAX+MOTO+2K.png', 'Nike Air Max Moto 2K – giày chạy bộ phong cách retro'),
(100, 2, 'https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/90bb8cc7-89de-4d95-af14-dd6d88e951fc/NIKE+AIR+FORCE+1+%2707+LV8.png', 'Nike Air Force 1 LV8 – thiết kế kinh điển mọi thời đại'),
(101, 40, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/55a67474-4e50-46c3-8fb4-0e7146371b2d/NIKE+PEGASUS+PREMIUM.png', 'Nike Pegasus Premium'),
(102, 41, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/4e525ecf-b6d1-497b-80b2-ec6c02fda1c0/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(103, 42, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/7c907d55-37aa-43ea-9df8-02969aee5e72/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(104, 43, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/d4d3fb00-f482-4bcb-9a15-1dbd99858409/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(105, 44, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/3b5315d1-6b54-4158-bb62-094ecd45542a/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(106, 45, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/ab581537-fbd1-41c8-bded-200fa4f49db0/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(107, 46, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/4b487ad4-77c0-41a9-831c-70e7c9aa7e10/NIKE+STRUCTURE+26+WIDE.png', 'Nike Structure 26 Wide'),
(108, 47, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/568028fb-0598-4ea7-a111-36084926584c/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(109, 48, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/d447f58e-ccf5-4675-8b6e-ef7a2db5a51f/AIR+ZOOM+ALPHAFLY+NEXT%25+3.png', 'Nike Alphafly Next% 3'),
(110, 49, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/10ac914b-824e-4d3a-8f59-de633c893d20/ZOOM+FLY+6+EK.png', 'Nike Zoom Fly 6 EK'),
(111, 50, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/c714752a-28f0-47af-bcaf-93c2bf97f060/AIR+ZOOM+ALPHAFLY+NEXT%25+3+EK.png', 'Nike Alphafly Next% 3 EK'),
(112, 51, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/833fb6e2-e7c9-4a89-b2c4-fdc4ade82b04/ZOOMX+VAPORFLY+NEXT%25+4+EK.png', 'Nike Vaporfly Next% 4 EK'),
(113, 52, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/36effcab-4862-4d64-a838-4ff1ce659253/AIR+ZOOM+PEGASUS+41+EK.png', 'Nike Pegasus 41 EK'),
(114, 53, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/6c9bee45-9b41-4b38-997a-1c056e2797db/NIKE+VOMERO+PREMIUM.png', 'Nike Vomero Premium'),
(115, 54, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/1f2f27fc-f623-4a79-9da1-0c01d8e5aef3/NIKE+VOMERO+PREMIUM.png', 'Nike Vomero Premium'),
(116, 55, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/47eea8e8-a0d6-4172-8dd5-7f517f1606fb/NIKE+PEGASUS+PREMIUM.png', 'Nike Pegasus Premium'),
(117, 56, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/f7aed889-2f13-428b-9cb5-228e769818fe/NIKE+PEGASUS+PREMIUM.png', 'Nike Pegasus Premium'),
(118, 57, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/036a0092-6e4c-42fc-92d7-4a50ae1611e0/NIKE+PEGASUS+PREMIUM+LV8.png', 'Nike Pegasus Premium LV8'),
(119, 58, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/fd2a0420-e598-407d-a015-9f5fb409d486/NIKE+PEGASUS+PREMIUM.png', 'Nike Pegasus Premium'),
(120, 59, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/9a7464de-4e4a-4278-afef-f808b06f0d54/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(121, 60, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/13d60b7e-36db-4c5d-923a-aae071a991d8/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(122, 61, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/65600ff3-854d-44ac-ab61-2e8ad71fab85/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(123, 62, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/a2f1511f-c00e-47db-a980-16acd6cfeced/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(124, 63, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/bd2ae43b-34bd-47ae-9379-d7b4f52fd0e1/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(125, 64, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/8d73cd25-91cc-48fe-9514-7a41daccb7ef/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(126, 65, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/053d5240-66c4-4e1f-9d20-99b71e7f422a/NIKE+VOMERO+PLUS.png', 'Nike Vomero Plus'),
(127, 66, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/662016e5-2ed7-4ffb-a7c2-7e4229f3ccf7/ZOOM+FLY+6.png', 'Nike Zoom Fly 6'),
(128, 67, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/a1f54fc0-fb4f-43b3-8c17-b5bcb41abaf4/ZOOM+FLY+6.png', 'Nike Zoom Fly 6'),
(129, 68, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/7d007cdb-aff7-4e02-8e44-3db197d7db9b/ZOOMX+STREAKFLY+2.png', 'Nike Streakfly 2'),
(130, 69, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/c52ed127-d0dd-43d8-a58f-49094cc05f8d/AIR+ZOOM+ALPHAFLY+NEXT%25+3.png', 'Nike Alphafly Next% 3'),
(131, 70, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/2eab0beb-140d-4490-b3b1-57acc6415dd3/ZOOMX+VAPORFLY+NEXT%25+4+PRM.png', 'Nike Vaporfly Next% 4 PRM'),
(132, 71, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/2a3501e4-8829-47f1-a949-ef6ff5cb2fb9/AIR+ZOOM+ALPHAFLY+NEXT%25+3+PRM.png', 'Nike Alphafly Next% 3 PRM'),
(133, 72, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/9460d99d-f619-4051-b7f6-6b4e1cdb2736/ZOOMX+DRAGONFLY+2.png', 'Nike Dragonfly 2'),
(134, 73, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/552ce283-d86d-4b5d-a8df-9fe5f07d92a8/NIKE+ZOOM+JA+FLY+4.png', 'Nike Zoom JA Fly 4'),
(135, 74, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/1f997160-79aa-4be8-a178-5101a85ada62/AIR+ZOOM+ALPHAFLY+NEXT%25+3.png', 'Nike Alphafly Next% 3'),
(136, 75, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/bf1b1228-5f3b-4f2a-aaff-92bfae65932d/NIKE+AIR+ZOOM+RIVAL+FLY+4.png', 'Nike Rival Fly 4'),
(137, 76, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/0333e735-1db1-43d1-b9d9-89fbb39a4179/AIR+ZOOM+PEGASUS+41.png', 'Nike Pegasus 41'),
(138, 77, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/7398595f-7dab-4aa3-b7c6-6fd556fddf09/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(139, 78, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/20f6c232-1316-4951-a971-bc873247d27d/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(140, 79, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/d84b317d-34b7-42cf-be58-461f4a95c921/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(141, 80, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/be410ad1-3a17-4b2e-8cf4-b18eb71bf6ee/NIKE+STRUCTURE+26+WIDE.png', 'Nike Structure 26 Wide'),
(142, 81, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/d125747b-211b-44a9-99ab-b66a0e1fb9bc/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(143, 82, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/53d5ee00-2707-4703-8605-fc734ceaef3d/NIKE+STRUCTURE+26.png', 'Nike Structure 26'),
(144, 83, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/187b6629-deb5-4bf0-90f9-ba1d60040d85/NIKE+VOMERO+PREMIUM.png', 'Nike Vomero Premium'),
(145, 84, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/8312e20d-5b44-4b90-a355-1f8397f74d1a/AIR+ZOOM+PEGASUS+41.png', 'Nike Pegasus 41'),
(146, 85, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/f6105318-3c83-4836-ab5b-96f2cd95de00/AIR+ZOOM+PEGASUS+41.png', 'Nike Pegasus 41'),
(147, 86, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/b8b41695-e592-471f-9f77-166e14969695/NIKE+VOMERO+18.png', 'Nike Vomero 18'),
(148, 87, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/01870679-4366-4262-a6e8-f2b8a52860f0/NIKE+VOMERO+18.png', 'Nike Vomero 18'),
(149, 88, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/c59b96dc-38b1-4f8c-96b4-d4d1181f4a1d/AIR+ZOOM+PEGASUS+41+WIDE.png', 'Nike Pegasus 41 Wide'),
(150, 89, 'https://static.nike.com/a/images/t_web_pw_592_v2/f_auto/389dec57-8325-4b5a-b2db-11e512fb2079/NIKE+QUEST+6.png', 'Nike Quest 6'),
(152, 40, 'https://res.cloudinary.com/dwgvsouwk/image/upload/v1762752939/product_images/nike_shoes.jpg', 'Giày đẹp quá đi mất'),
(153, 1, 'https://res.cloudinary.com/dwgvsouwk/image/upload/v1762752939/product_images/nike_shoes.jpg', 'Ảnh sản phẩm'),
(154, 5, 'https://res.cloudinary.com/dwgvsouwk/image/upload/v1762752939/product_images/nike_shoes.jpg', 'Ảnh sản phẩm'),
(155, 10, 'https://res.cloudinary.com/dwgvsouwk/image/upload/v1762752939/product_images/nike_shoes.jpg', 'Ảnh sản phẩm');

INSERT INTO "public"."users" ("id", "email", "password_hash", "name", "avatar_url", "phone", "address", "is_email_verified", "is_admin", "created_at", "social_id", "social_provider", "otp_code", "otp_expires_at") VALUES
(3, 'leminhc@example.com', 'hashed_password_3', 'Lê Minh C', 'https://i.pravatar.cc/150?img=3', '0987654321', '78 Hai Bà Trưng, Q.3, TP.HCM', 't', 't', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(4, 'phamthid@example.com', 'hashed_password_4', 'Phạm Thị D', 'https://i.pravatar.cc/150?img=4', '0934567890', '12 Điện Biên Phủ, Q.Bình Thạnh, TP.HCM', 'f', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(5, 'hoangvanh@example.com', 'hashed_password_5', 'Hoàng Văn H', 'https://i.pravatar.cc/150?img=5', '0978123456', '89 Lê Lợi, Q.1, TP.HCM', 't', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(6, 'dangthik@example.com', 'hashed_password_6', 'Đặng Thị K', 'https://i.pravatar.cc/150?img=6', '0967123456', '56 Võ Văn Kiệt, Q.5, TP.HCM', 't', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(7, 'buiminhl@example.com', 'hashed_password_7', 'Bùi Minh L', 'https://i.pravatar.cc/150?img=7', '0945123789', '23 Nguyễn Văn Linh, Q.7, TP.HCM', 'f', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(8, 'vothim@example.com', 'hashed_password_8', 'Võ Thị M', 'https://i.pravatar.cc/150?img=8', '0923456789', '67 Cách Mạng Tháng Tám, Q.10, TP.HCM', 't', 't', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(9, 'truongvanp@example.com', 'hashed_password_9', 'Trương Văn P', 'https://i.pravatar.cc/150?img=9', '0911222333', '101 Phan Xích Long, Q.Phú Nhuận, TP.HCM', 'f', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(10, 'dothiq@example.com', '$2b$10$8qfqfzo6s3.dY0n/kPPtPOhHsdDhQ1xQ/6.zliBIkFk6TWXvOC8e.', 'Đỗ Thị Q', 'https://i.pravatar.cc/150?img=10', '0909988776', '34 Trần Hưng Đạo, Q.1, TP.HCM', 't', 'f', '2025-09-30 03:53:29.159156', NULL, NULL, NULL, NULL),
(11, 'hung123@gmail.com', '$2b$10$9ITYD28pVQl2qcgZmjDs3uY5iSDEFoYUruPX8A4/pWwJVrla596a6', 'Hung qua vjp', NULL, '0123141', '161 hung vuong tp ho chi minh', 'f', 'f', '2025-10-25 16:12:51.021', NULL, NULL, NULL, NULL),
(12, 'hung1234@gmail.com', '$2b$10$BC667.trMXj2oXLwRMVX5uGAB9Dfi/ugkkDC6tX3u0LtAHjco6L5a', 'Hung qua vjp', NULL, '0123141', '161 hung vuong tp ho chi minh', 'f', 't', '2025-10-25 16:15:44.56', NULL, NULL, NULL, NULL),
(13, 'hungtrung@gmail.com', '$2b$10$01qLYxXFsOwfHgRhpndZM.cEWt8l77ABB24pBOPPIQ8mKaYt97Iim', 'HƯNG', NULL, '0123141432', '161 hung vuong tp ho chi minh viet nam', 'f', 'f', '2025-10-28 06:28:59.607', NULL, NULL, NULL, NULL),
(14, 'hle01678z@gmail.com', '$2b$10$MJWt.BLG6X0V1ZW/E6YLvehPXPR94d4Uj0AOE3QF2hEHtjrVgNQZ.', 'Hưng', NULL, '15030151351', NULL, 'f', 'f', '2025-11-02 13:43:12.538', NULL, NULL, NULL, NULL),
(16, 'hungpro123@gmail.com', '$2b$10$uVWOWwoAxdTKYtNQnRhF9.Ttjb3k0Ii9tgJR/rmXypqpGjViGtQWm', 'Hưng Hải', NULL, '', '', 'f', 'f', '2025-11-09 04:19:44.956', NULL, NULL, NULL, NULL),
(17, 'hungproo123@gmail.com', '$2b$10$a3SepXshFLK0XN/jhQPwu.Ofb7jeOjNWX2aJ.fY3FThzG7YsxiabC', 'Hưng Hải', NULL, '', '', 'f', 'f', '2025-11-09 04:20:20.918', NULL, NULL, NULL, NULL),
(18, 'hle01679z@gmail.com', '$2b$10$ZR4unlX1M.BMQZzqwpPopOLOv/eplBUqRSXoC8GoW6OMgppjop/8.', 'Hưng Hải', NULL, '', '', 'f', 'f', '2025-11-09 04:21:04.662', NULL, NULL, NULL, NULL),
(19, 'hle0167z@gmail.com', '$2b$10$r6dQg3/JtBm6uiVrfE6b3u.WafBHXxNtB4Y/NUjnmROslaA7PIkia', 'Hưng Lê', NULL, '', '', 'f', 't', '2025-11-09 04:21:59.899', NULL, NULL, NULL, NULL),
(20, 'hle@gmail.com', '$2b$10$2AgokLfnKRi9Q1xIUnW4Uu6faYqh9wwmPTLZcxFUOz7MqCADV6qg6', 'lê hung', NULL, '', '', 'f', 'f', '2025-11-09 04:32:47.437', NULL, NULL, NULL, NULL),
(22, 'test@gmail.com', '$2b$10$tYlVatVE1YbHxbgVpiZzWeTqnUx0syIeQt/0KC0nug5hOGSlTfXjK', 'lê hung', NULL, '', '', 'f', 'f', '2025-12-02 03:47:46.834', NULL, NULL, NULL, NULL),
(23, 'letrunghung24022004@gmail.com', '$2b$10$TAlvskU5vAaHSaMW2KjOneKd6WtMY8KLM.09UH1XYHByuSpBMupUO', 'lê hung', NULL, '', '', 'f', 'f', '2025-12-02 03:48:46.876', NULL, NULL, NULL, NULL);

INSERT INTO "public"."addresses" ("id", "user_id", "receiver_name", "phone", "address_line", "city", "district", "is_default", "created_at") VALUES
(3, 3, 'Lê Minh C', '0987654321', '78 Hai Bà Trưng', 'TP.HCM', 'Quận 3', 't', '2025-09-30 03:53:38.286267'),
(4, 4, 'Phạm Thị D', '0934567890', '12 Điện Biên Phủ', 'TP.HCM', 'Bình Thạnh', 't', '2025-09-30 03:53:38.286267'),
(5, 5, 'Hoàng Văn H', '0978123456', '89 Lê Lợi', 'TP.HCM', 'Quận 1', 't', '2025-09-30 03:53:38.286267'),
(6, 6, 'Đặng Thị K', '0967123456', '56 Võ Văn Kiệt', 'TP.HCM', 'Quận 5', 't', '2025-09-30 03:53:38.286267'),
(7, 7, 'Bùi Minh L', '0945123789', '23 Nguyễn Văn Linh', 'TP.HCM', 'Quận 7', 't', '2025-09-30 03:53:38.286267'),
(8, 8, 'Võ Thị M', '0923456789', '67 Cách Mạng Tháng Tám', 'TP.HCM', 'Quận 10', 't', '2025-09-30 03:53:38.286267'),
(9, 9, 'Trương Văn P', '0911222333', '101 Phan Xích Long', 'TP.HCM', 'Phú Nhuận', 't', '2025-09-30 03:53:38.286267'),
(10, 10, 'Đỗ Thị Q', '0909988776', '34 Trần Hưng Đạo', 'TP.HCM', 'Quận 1', 't', '2025-09-30 03:53:38.286267'),
(13, 3, 'Lê Minh C', '0987654321', '78 Hai Bà Trưng', 'TP.HCM', 'Quận 3', 't', '2025-09-30 03:53:39.757477'),
(15, 5, 'Hoàng Văn H', '0978123456', '89 Lê Lợi', 'TP.HCM', 'Quận 1', 't', '2025-09-30 03:53:39.757477'),
(16, 6, 'Đặng Thị K', '0967123456', '56 Võ Văn Kiệt', 'TP.HCM', 'Quận 5', 't', '2025-09-30 03:53:39.757477'),
(17, 7, 'Bùi Minh L', '0945123789', '23 Nguyễn Văn Linh', 'TP.HCM', 'Quận 7', 't', '2025-09-30 03:53:39.757477'),
(18, 8, 'Võ Thị M', '0923456789', '67 Cách Mạng Tháng Tám', 'TP.HCM', 'Quận 10', 't', '2025-09-30 03:53:39.757477'),
(19, 9, 'Trương Văn P', '0911222333', '101 Phan Xích Long', 'TP.HCM', 'Phú Nhuận', 't', '2025-09-30 03:53:39.757477'),
(20, 10, 'Đỗ Thị Q', '0909988776', '34 Trần Hưng Đạo', 'TP.HCM', 'Quận 1', 't', '2025-09-30 03:53:39.757477'),
(22, 6, 'Nguyen Van Hung', '0912345678', '123 Le Loi, Phuong 5', 'Ho Chi Minh', 'Quan 1', 't', '2025-09-30 07:48:23.065'),
(26, 14, 'Hưng pro vjpp quá', '0945653477', '161 Hùng Vương', 'TP.HCM', 'quận 10', 'f', '2025-11-06 05:47:07.789'),
(27, 14, 'Nguyễn Thị Nương', '01678007167', '161 Hùng Vương', 'TP.HCM', 'Phường Sài Gòn', 'f', '2025-11-06 06:46:23.602'),
(30, 14, 'Hải', '12131341413', '4 Trần Hưng Đạo', 'TPHCM', 'Phường Bến Thành', 'f', '2025-11-07 07:56:50.663'),
(32, 23, 'Nguyễn Hoàng Hiệp', '0945653677', '161 Hồng Bàng', 'Hà Nội', 'Phường Thanh Xuân', 'f', '2025-12-02 05:35:17.857');

INSERT INTO "public"."loyalty_points" ("id", "user_id", "points", "updated_at") VALUES
(1, 6, 7691, '2025-10-01 06:50:17'),
(2, 3, 1859, '2025-10-01 06:50:17'),
(3, 6, 5726, '2025-10-01 06:50:17'),
(5, 6, 8859, '2025-10-01 06:50:17'),
(6, 10, 9982, '2025-09-30 06:50:17'),
(7, 23, 97000, '2025-12-02 04:30:03.229'),
(8, 23, 220684, '2025-12-02 05:52:47.461');

INSERT INTO "public"."wishlists" ("id", "user_id", "product_id", "created_at") VALUES
(1, 10, 1, '2025-10-28 04:02:06.382');

INSERT INTO "public"."reviews" ("id", "user_id", "product_id", "rating", "comment", "created_at", "updated_at") VALUES
(1, 23, 50, 5, 'sản phẩm rất tốt', '2025-12-02 03:51:10.514', NULL),
(3, 14, 71, 4, 'Sản phẩm tốt', '2025-11-08 08:35:32.906', NULL),
(4, 14, 71, 4, 'good', '2025-11-08 08:41:41.509', NULL),
(5, 14, 81, 3, 'Giày đẹp qué', '2025-11-08 08:42:59.169', NULL),
(6, 23, 79, 5, 'Đôi giày đẹp, bền hiệu năng tốt', '2025-12-02 05:51:53.579', NULL);

INSERT INTO "public"."discount_codes" ("id", "code", "description", "discount_type", "value", "min_order_amount", "usage_limit", "used_count", "valid_from", "valid_to", "is_active") VALUES
(2, 'SAVE50K', 'Giảm 50k cho đơn từ 500k', 'fixed', 50000.00, 500000.00, 100, 8, '2025-11-25', '2025-12-29', 't'),
(4, 'NEWYEAR', 'Chúc mừng năm mới giảm tối đa đến 10% cho đơn hàng từ 5.000.000đ', 'percent', 10.00, 5000000.00, 10, 0, '2025-12-30', '2026-01-09', 't'),
(5, 'SALE12.12', 'Siêu Sale 12 tháng 12', 'fixed', 100000.00, 0.00, 10, 0, '2025-11-30', '2025-12-11', 'f'),
(7, 'OLDCUSTOMER100', 'giảm giá cho khách hàng cũ có hoá đơn tổng hợp trên 100 triệu', 'percent', 10.00, 0.00, 10, 0, '2025-11-30', '2025-12-30', 'f');

INSERT INTO "public"."categories" ("id", "name", "slug", "description") VALUES
(1, 'Giày', 'giay', 'Tất cả các loại giày thể thao'),
(2, 'Áo', 'ao', 'Áo thể thao chính hãng'),
(3, 'Giày Chạy Bộ', 'giay-chay-bo', 'Giày chạy bộ Nike với công nghệ tiên tiến, mang lại cảm giác nhẹ và đàn hồi tối đa.'),
(4, 'Giày Bóng Rổ', 'giay-bong-ro', 'Giày bóng rổ Nike mang phong cách thể thao mạnh mẽ, nổi bật với dòng Air Jordan và LeBron.'),
(5, 'Giày Lifestyle', 'giay-lifestyle', 'Dòng sneaker thời trang Nike dành cho phong cách đường phố và hằng ngày.'),
(6, 'Quần Áo Nam', 'quan-ao-nam', 'Bộ sưu tập áo thun, áo khoác và quần thể thao dành cho nam giới.'),
(7, 'Quần Áo Nữ', 'quan-ao-nu', 'Trang phục năng động, hiện đại và thoải mái dành cho nữ giới.'),
(8, 'Phụ Kiện', 'phu-kien', 'Các phụ kiện thể thao chính hãng Nike như nón, balo, túi đeo và tất.'),
(9, 'Trẻ Em', 'tre-em', 'Giày và quần áo dành cho trẻ em, mang lại sự thoải mái và phong cách.'),
(10, 'Bộ Sưu Tập Jordan', 'bo-suu-tap-jordan', 'Biểu tượng của Nike với thiết kế táo bạo, tinh thần thể thao và phong cách đường phố.'),
(11, 'Bộ Sưu Tập Air Max', 'bo-suu-tap-air-max', 'Dòng sản phẩm Air Max với thiết kế hiện đại và đệm khí mang tính biểu tượng.');

ALTER TABLE "public"."orders" ADD FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."orders" ADD FOREIGN KEY ("discount_code_id") REFERENCES "public"."discount_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."orders" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."order_items" ADD FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."order_items" ADD FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."product_variants" ADD FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX product_variants_sku_key ON public.product_variants USING btree (sku);
ALTER TABLE "public"."products" ADD FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX products_slug_key ON public.products USING btree (slug);
ALTER TABLE "public"."product_images" ADD FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);
ALTER TABLE "public"."addresses" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."cart_items" ADD FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."cart_items" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."loyalty_points" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."wishlists" ADD FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."wishlists" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX wishlists_user_id_product_id_key ON public.wishlists USING btree (user_id, product_id);
ALTER TABLE "public"."reviews" ADD FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."reviews" ADD FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Indices
CREATE UNIQUE INDEX discount_codes_code_key ON public.discount_codes USING btree (code);


-- Indices
CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);
CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);



-- 1) addresses
SELECT setval('addresses_id_seq', COALESCE((SELECT MAX(id) FROM addresses), 0), true);


-- 3) categories
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0), true);

-- 4) discount_codes
SELECT setval('discount_codes_id_seq', COALESCE((SELECT MAX(id) FROM discount_codes), 0), true);

-- 5) loyalty_points
SELECT setval('loyalty_points_id_seq', COALESCE((SELECT MAX(id) FROM loyalty_points), 0), true);

-- 6) order_items
SELECT setval('order_items_id_seq', COALESCE((SELECT MAX(id) FROM order_items), 0), true);

-- 7) orders
SELECT setval('orders_id_seq', COALESCE((SELECT MAX(id) FROM orders), 0), true);

-- 8) product_images
SELECT setval('product_images_id_seq', COALESCE((SELECT MAX(id) FROM product_images), 0), true);

-- 9) product_variants
SELECT setval('product_variants_id_seq', COALESCE((SELECT MAX(id) FROM product_variants), 0), true);

-- 10) products
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 0), true);

-- 11) reviews
SELECT setval('reviews_id_seq', COALESCE((SELECT MAX(id) FROM reviews), 0), true);

-- 12) users
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0), true);

-- 13) wishlists
SELECT setval('wishlists_id_seq', COALESCE((SELECT MAX(id) FROM wishlists), 0), true);

