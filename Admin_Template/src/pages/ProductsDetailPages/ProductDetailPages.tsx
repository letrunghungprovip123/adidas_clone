import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Space,
  message,
  Spin,
  Upload,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  getProductById,
  createProductVariant,
  updateProductVariant,
  createImageProduct,
} from "../../api/productApi";

const ProductDetailPages: React.FC = () => {
  // 🆔 Lấy ID sản phẩm từ URL
  const id = window.location.pathname.split("/").pop();

  const [product, setProduct] = useState<any | null>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  // -------------------------------
  // 📦 Lấy chi tiết sản phẩm theo ID
  // -------------------------------
  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      if (!id) throw new Error("Thiếu ID sản phẩm");

      const res = await getProductById(Number(id));
      const data = res.data.data;

      setProduct(data);
      setVariants(data.product_variants || []);
    } catch (err) {
      console.error(err);
      messageApi.error("Không thể tải chi tiết sản phẩm!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProductDetail();
  }, [id]);

  // --------------------------------
  // 💾 Thêm / Sửa biến thể
  // --------------------------------
  const handleSubmitVariant = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        product_id: Number(id),
        stock: Number(values.stock || 0),
      };

      if (editingVariant) {
        await updateProductVariant(payload, editingVariant.id);
        messageApi.success("Cập nhật biến thể thành công!");
      } else {
        await createProductVariant(payload);
        messageApi.success("Thêm biến thể thành công!");
      }

      setIsModalOpen(false);
      form.resetFields();
      fetchProductDetail();
    } catch (err) {
      console.error(err);
      messageApi.error("Lỗi khi lưu biến thể!");
    }
  };

  // --------------------------------
  // 🗑️ Xóa biến thể
  // --------------------------------
  const handleDeleteVariant = async (variantId: number) => {
    Modal.confirm({
      title: "Xác nhận xóa biến thể?",
      okText: "Xóa",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          // TODO: Gọi API xóa variant khi backend sẵn sàng
          messageApi.success("Đã xóa biến thể (demo)");
          fetchProductDetail();
        } catch (err) {
          messageApi.error("Lỗi khi xóa biến thể!");
        }
      },
    });
  };

  // --------------------------------
  // 📤 Upload ảnh sản phẩm
  // --------------------------------
  const handleUpload = async ({ file }: any) => {
    if (!file) return;
    try {
      await createImageProduct(file, Number(id), "Ảnh sản phẩm");
      messageApi.success("Tải ảnh lên thành công!");
      fetchProductDetail();
    } catch (error) {
      console.error(error);
      messageApi.error("Lỗi khi tải ảnh lên!");
    }
  };

  // ⚙️ Cột bảng Variant
  const variantColumns = [
    { title: "Size", dataIndex: "size" },
    { title: "Màu sắc", dataIndex: "color" },
    { title: "Tồn kho", dataIndex: "stock" },
    { title: "SKU", dataIndex: "sku" },
    {
      title: "Hành động",
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingVariant(record);
              form.setFieldsValue(record);
              setIsModalOpen(true);
            }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteVariant(record.id)}
          />
        </Space>
      ),
    },
  ];

  if (loading)
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ padding: 24 }}>
      {contextHolder}

      {/* 🔙 Header */}
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => window.history.back()}
        >
          Quay lại
        </Button>
        <h2 style={{ fontWeight: "bold", margin: 0 }}>Chi tiết sản phẩm</h2>
      </Space>

      {/* 🧾 Thông tin sản phẩm */}
      {product && (
        <Card style={{ marginBottom: 24 }}>
          <p>
            <b>Tên sản phẩm:</b> {product.name}
          </p>
          <p>
            <b>Giá:</b> {Number(product.price).toLocaleString()} ₫
          </p>
          <p>
            <b>Thương hiệu:</b> {product.brand}
          </p>
          <p>
            <b>Giới tính:</b> {product.gender}
          </p>
        </Card>
      )}

      {/* 📦 Biến thể */}
      <Card
        title="Biến thể sản phẩm (Product Variants)"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingVariant(null);
              form.resetFields();
              setIsModalOpen(true);
            }}
          >
            Thêm biến thể
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={variantColumns}
          dataSource={variants}
          pagination={{ pageSize: 5 }}
        />
      </Card>

      {/* 🖼️ Hình ảnh sản phẩm */}
      <Card
        title="Hình ảnh sản phẩm (Product Images)"
        style={{ marginTop: 24 }}
        extra={
          <Upload
            name="file"
            accept="image/*"
            showUploadList={false}
            customRequest={handleUpload}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              Upload ảnh
            </Button>
          </Upload>
        }
      >
        <Space wrap>
          {product?.product_images?.length ? (
            product.product_images.map((img: any) => (
              <img
                key={img.id}
                src={img.image_url}
                alt={img.alt_text || "Ảnh sản phẩm"}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 8,
                  objectFit: "cover",
                  border: "1px solid #eee",
                }}
              />
            ))
          ) : (
            <p>🚧 Sản phẩm chưa có hình ảnh.</p>
          )}
        </Space>
      </Card>

      {/* 🪟 Modal thêm/sửa Variant */}
      <Modal
        title={editingVariant ? "Chỉnh sửa biến thể" : "Thêm biến thể mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSubmitVariant}
        okText="Lưu"
        confirmLoading={loading}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Size"
            name="size"
            rules={[{ required: true, message: "Vui lòng nhập size!" }]}
          >
            <Input placeholder="VD: 40, 41, S, M..." />
          </Form.Item>

          <Form.Item
            label="Màu sắc"
            name="color"
            rules={[{ required: true, message: "Vui lòng nhập màu sắc!" }]}
          >
            <Input placeholder="VD: Đen, Trắng, Đỏ..." />
          </Form.Item>

          <Form.Item label="Tồn kho" name="stock">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="SKU" name="sku">
            <Input placeholder="VD: PROD1-S-RED" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductDetailPages;
