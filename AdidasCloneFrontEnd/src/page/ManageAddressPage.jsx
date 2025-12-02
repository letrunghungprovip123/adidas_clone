// src/pages/ManageAddressPage.jsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../api/addressApi";
import { message, Modal } from "antd";
import { Package, X, Edit2, Trash2 } from "lucide-react";

const ManageAddressPage = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [formData, setFormData] = useState({
    receiver_name: "",
    phone: "",
    address_line: "",
    city: "",
    district: "",
  });

  // === useMessage ===
  const [messageApi, contextHolder] = message.useMessage();
  const [modal, contextHolder2] = Modal.useModal();
  // === LẤY DANH SÁCH ĐỊA CHỈ ===
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddresses,
    select: (res) => res.data || [],
  });

  // === MUTATIONS ===
  const addMutation = useMutation({
    mutationFn: addAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Đã thêm địa chỉ thành công");
      closeModal();
    },
    onError: () => messageApi.error("Không thể thêm địa chỉ"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Đã cập nhật địa chỉ");
      closeModal();
    },
    onError: () => messageApi.error("Không thể cập nhật"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      messageApi.success("Đã xóa địa chỉ");
    },
    onError: () => messageApi.error("Không thể xóa"),
  });

  // === XỬ LÝ FORM ===
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const { receiver_name, phone, address_line, city, district } = formData;
    if (!receiver_name || !phone || !address_line || !city || !district) {
      messageApi.warning("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (editingAddress) {
      updateMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const openAddModal = () => {
    setEditingAddress(null);
    setFormData({
      receiver_name: "",
      phone: "",
      address_line: "",
      city: "",
      district: "",
    });
    setShowModal(true);
  };

  const openEditModal = (address) => {
    setEditingAddress(address);
    setFormData({
      receiver_name: address.receiver_name,
      phone: address.phone,
      address_line: address.address_line,
      city: address.city,
      district: address.district,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAddress(null);
  };

  return (
    <>
      {contextHolder}
      {contextHolder2}
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-medium mb-8">Settings</h2>
              <nav className="space-y-1">
                <a
                  href="#"
                  className="flex items-center gap-3 px-4 py-3 rounded hover:bg-gray-100 transition"
                >
                  <Package size={20} />
                  <span>Delivery Addresses</span>
                </a>
                {/* Các menu khác */}
              </nav>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-medium">
                  Saved Delivery Addresses
                </h1>
                <button
                  onClick={openAddModal}
                  className="bg-black text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition"
                >
                  Add Address
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-10">Đang tải...</div>
              ) : addresses.length === 0 ? (
                <p className="text-gray-600">
                  Bạn chưa có địa chỉ nào. Thêm ngay!
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {addresses.data?.map((addr) => (
                    <div
                      key={addr.id}
                      className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition cursor-pointer"
                      onClick={() => openEditModal(addr)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">
                          {addr.receiver_name}
                        </h3>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(addr);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition"
                          >
                            <Edit2 size={18} className="text-gray-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              modal.confirm({
                                title: "Xác nhận xoá",
                                content:
                                  "Bạn có chắc muốn xoá địa chỉ này không?",
                                okText: "Xoá",
                                cancelText: "Huỷ",
                                okButtonProps: {
                                  className: "bg-red-600 hover:bg-red-700",
                                },
                                onOk: () => deleteMutation.mutate(addr.id),
                              });
                            }}
                            className="p-2 hover:bg-red-50 rounded-full transition"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </div>
                      <p className="text-gray-700">{addr.phone}</p>
                      <p className="text-gray-600 mt-1">
                        {addr.address_line}, {addr.district}, {addr.city}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL - KHÔNG LÀM TỐI MÀN HÌNH */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop mờ nhẹ */}
            <div
              className="absolute inset-0 bg-black opacity-30"
              onClick={closeModal}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-200">
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition"
              >
                <X size={20} />
              </button>

              <h2 className="text-2xl font-semibold mb-6">
                {editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}
              </h2>

              <div className="space-y-5">
                <input
                  type="text"
                  placeholder="Họ và tên*"
                  value={formData.receiver_name}
                  onChange={(e) =>
                    handleInputChange("receiver_name", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                />
                <input
                  type="tel"
                  placeholder="Số điện thoại*"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                />
                <input
                  type="text"
                  placeholder="Địa chỉ (số nhà, đường)*"
                  value={formData.address_line}
                  onChange={(e) =>
                    handleInputChange("address_line", e.target.value)
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Quận/Huyện*"
                    value={formData.district}
                    onChange={(e) =>
                      handleInputChange("district", e.target.value)
                    }
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                  <input
                    type="text"
                    placeholder="Tỉnh/Thành phố*"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={addMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    {addMutation.isPending || updateMutation.isPending
                      ? "Đang lưu..."
                      : "Lưu địa chỉ"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ManageAddressPage;
