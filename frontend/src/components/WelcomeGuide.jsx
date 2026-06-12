export default function WelcomeGuide({ onClose }) {
  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
          <h2>Chào mừng đến với VSChat</h2>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="welcome-content">
          <p>
            VSChat là ứng dụng chat nội bộ của công ty, dùng để trao đổi công
            việc nhanh chóng giữa các nhân viên.
          </p>

          <ul>
            <li>
              <strong>Nhóm chung:</strong> dùng để trao đổi thông tin chung của
              công ty.
            </li>
            <li>
              <strong>Nhóm riêng:</strong> tạo nhóm với các nhân viên cần trao
              đổi riêng.
            </li>
            <li>
              <strong>Gửi ảnh/file:</strong> bấm nút 📎 để gửi hình ảnh hoặc tài
              liệu.
            </li>
            <li>
              <strong>Đã gửi / đã xem:</strong> kiểm tra trạng thái bên dưới tin
              nhắn. Ấn vào để xem người đã xem.
            </li>
            <li>
              <strong>Thu hồi:</strong> chỉ thu hồi được tin nhắn do mình gửi.
            </li>
            <li>
              <strong>Cảm xúc:</strong> bấm biểu tượng 👍 ❤️ 😂 để phản hồi
              nhanh.
            </li>
            <li>
              <strong>Ảnh/File:</strong> xem lại hình ảnh và tài liệu đã gửi
              theo từng ngày.
            </li>
            <li>
              <strong>Menu ☰:</strong> dùng để mở danh sách nhóm, tạo nhóm và
              người online.
            </li>
          </ul>

          <p className="welcome-note">
            Lưu ý: Tài khoản chỉ được cấp cho nhân viên công ty. Không chia sẻ
            tài khoản cho người ngoài.
          </p>
        </div>

        <button type="button" className="welcome-ok-btn" onClick={onClose}>
          Tôi đã hiểu
        </button>
      </div>
    </div>
  );
}
