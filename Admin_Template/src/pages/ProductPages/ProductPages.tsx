import React, { useEffect, useState } from "react";
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  message,
  Form,
  InputNumber,
  Select,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  FundViewOutlined,
} from "@ant-design/icons";
import {
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategory,
} from "../../api/productApi";
import {
  CubeIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";
const { Option } = Select;

const ProductPages: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  console.log(products);
  // 🏷️ Thương hiệu cố định
  const brands = ["Nike", "Adidas", "Jordan", "Puma", "New Balance"];

  // 📦 Lấy danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProduct();
      setProducts(res.data.data);
    } catch {
      messageApi.error("Không thể tải danh sách sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  // 📂 Lấy danh sách danh mục
  const fetchCategories = async () => {
    try {
      const res = await getCategory();
      setCategories(res.data.data);
    } catch {
      messageApi.error("Không thể tải danh mục!");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // 🔎 Lọc tìm kiếm
  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchText.toLowerCase())
  );

  // 🗑️ Xóa sản phẩm
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "Xác nhận xóa sản phẩm",
      content: "Bạn có chắc muốn xóa sản phẩm này?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProduct(id);
          messageApi.success("Đã xóa sản phẩm!");
          fetchProducts();
        } catch {
          messageApi.error("Lỗi khi xóa sản phẩm!");
        }
      },
    });
  };

  // 💾 Gửi form thêm / sửa
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        slug: values.slug,
        description: values.description || null,
        price: Number(values.price),
        category_id: Number(values.category_id),
        brand: values.brand,
        gender: values.gender || "unisex",
      };

      if (editingProduct) {
        await updateProduct(payload, editingProduct.id);
        messageApi.success("Cập nhật sản phẩm thành công!");
      } else {
        await createProduct(payload);
        messageApi.success("Thêm sản phẩm thành công!");
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchProducts();
    } catch (error) {
      console.error(error);
      messageApi.error("Lỗi khi lưu sản phẩm!");
    }
  };

  // ⚙️ Cột của bảng
  const columns = [
    {
      title: "Ảnh",
      dataIndex: "product_images",
      width: 100,
      render: (imgs: any[]) =>
        imgs?.[0] ? (
          <img
            src={imgs[0].image_url}
            alt={imgs[0].alt_text || "Ảnh sản phẩm"}
            style={{
              width: 70,
              height: 70,
              borderRadius: 8,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 70,
              height: 70,
              backgroundColor: "#f3f3f3",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
            }}
          >
            No Image
          </div>
        ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      render: (t: string) => <b>{t}</b>,
    },
    { title: "Danh mục", dataIndex: ["categories", "name"] },
    { title: "Thương hiệu", dataIndex: "brand" },
    { title: "Giới tính", dataIndex: "gender" },
    {
      title: "Giá",
      dataIndex: "price",
      render: (p: string) => `${Number(p).toLocaleString()} ₫`,
    },
    {
      title: "Trạng thái",
      align: "center" as const,
      render: (r: any) =>
        r.product_variants?.length > 0 ? (
          <CheckCircleIcon className="w-6 h-6 text-green-500 mx-auto" />
        ) : (
          <XCircleIcon className="w-6 h-6 text-gray-400 mx-auto" />
        ),
    },
    {
      title: "Hành động",
      align: "center" as const,
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<FundViewOutlined />}
            onClick={() => (window.location.href = `/products/${record.id}`)}
          >
            View
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingProduct(record);
              form.setFieldsValue({
                name: record.name,
                slug: record.slug,
                description: record.description,
                price: record.price,
                category_id: record.category_id,
                brand: record.brand,
                gender: record.gender,
              });
              setIsModalOpen(true);
            }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      {/* 🔹 Tiêu đề */}
      <h2
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <CubeIcon className="w-6 h-6 text-indigo-500" />
        Quản lý sản phẩm
      </h2>

      {/* 🔍 Thanh tìm kiếm + nút thêm */}
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm kiếm theo tên hoặc thương hiệu..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 260 }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProduct(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Thêm sản phẩm
        </Button>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchProducts}
          loading={loading}
        >
          Làm mới
        </Button>
      </Space>

      {/* 📋 Bảng */}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={filteredProducts}
        loading={loading}
        pagination={{ pageSize: 8 }}
      />

      {/* 🪟 Modal thêm/sửa */}
      <Modal
        title={editingProduct ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmit}
        okText="Lưu"
        confirmLoading={loading}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Tên sản phẩm"
            name="name"
            rules={[{ required: true, message: "Vui lòng nhập tên sản phẩm!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Slug"
            name="slug"
            rules={[{ required: true, message: "Vui lòng nhập slug!" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Danh mục"
            name="category_id"
            rules={[{ required: true, message: "Vui lòng chọn danh mục!" }]}
          >
            <Select placeholder="Chọn danh mục">
              {categories.map((c) => (
                <Option key={c.id} value={c.id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            label="Giá (₫)"
            name="price"
            rules={[{ required: true, message: "Vui lòng nhập giá!" }]}
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          {/* 🎽 Thương hiệu */}
          <Form.Item
            label="Thương hiệu"
            name="brand"
            rules={[{ required: true, message: "Vui lòng chọn thương hiệu!" }]}
          >
            <Select placeholder="Chọn thương hiệu">
              {brands.map((b) => (
                <Option key={b} value={b}>
                  {b}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Giới tính" name="gender">
            <Select placeholder="Chọn giới tính">
              <Option value="male">Nam</Option>
              <Option value="female">Nữ</Option>
              <Option value="unisex">Unisex</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductPages;
