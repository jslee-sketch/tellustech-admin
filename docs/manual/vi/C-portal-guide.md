---
title: "Tellustech ERP — Hướng dẫn Cổng thông tin Khách hàng"
subtitle: "Dành cho người phụ trách của khách hàng (v2 — phản ánh mở rộng cổng thông tin)"
author: "Tellustech IT Team"
date: "2026-04-28"
lang: vi
---

# Chào mừng quý khách

Cảm ơn quý khách đã sử dụng dịch vụ cho thuê IT, cho thuê thiết bị đo lường và bảo trì của Tellustech.

**Cổng thông tin Khách hàng** không chỉ là kênh tiếp nhận yêu cầu AS đơn thuần, mà còn là nền tảng tích hợp giúp quản lý toàn bộ dịch vụ của hai bộ phận OA và thiết bị đo lường tại một nơi duy nhất.

## Có thể làm gì?

### Bộ phận OA (máy in · máy đa năng)
- 📠 **Tình trạng cho thuê OA** — Xem nhanh hợp đồng · thiết bị · tình trạng thanh toán của tôi
- 🛠 **Yêu cầu AS** — Báo hỏng thiết bị mà mình đang sở hữu
- 📦 **Yêu cầu vật tư tiêu hao** — Đặt mực, hộp mực, linh kiện và các vật phẩm tương thích
- ✍️ **Xác nhận sử dụng** — Kiểm tra lượng sử dụng tính phí hàng tháng và ký tên trên di động

### Bộ phận thiết bị đo lường
- 🔬 **Tình trạng thuê / sửa chữa / hiệu chuẩn / bảo trì / mua bán** — 5 loại dịch vụ kèm theo cả thanh toán
- 📄 **Tải xuống chứng chỉ hiệu chuẩn**

### Giao tiếp (NEW)
- 💬 **Yêu cầu báo giá** — Yêu cầu báo giá ngay lập tức cho thuê IT · thiết bị đo lường · hiệu chuẩn · sửa chữa · mua bán
- 🤝 **Giới thiệu đối tác** — Khi giới thiệu khách hàng và phát sinh khoản thanh toán đầu tiên, tích lũy 100,000d
- 🌟 **Khen ngợi / Cải tiến / Đề xuất** — Khen ngợi nhân viên · ý kiến cải thiện dịch vụ
- 📰 **Tin tức** — Marketing · ngày lễ · xu hướng ngành · mẹo sử dụng
- 📊 **Khảo sát** — Tham gia khảo sát mức độ hài lòng của khách hàng nhận 10,000d

### 🏆 Hệ thống điểm thưởng (NEW)
Mọi hoạt động đều được tự động tích lũy. Mỗi yêu cầu AS · yêu cầu vật tư · xác nhận dịch vụ · xác nhận sử dụng được 1,000d, yêu cầu báo giá · đăng ý kiến 1,000d, tiền thưởng bài đăng linh hoạt, khảo sát 10,000d, thanh toán đầu tiên của hợp đồng giới thiệu 100,000d. Từ 1,000,000d có thể trừ vào tiền hóa đơn hoặc đổi thành phiếu quà tặng.

Hoạt động tương đương trên PC, máy tính bảng, smartphone và hỗ trợ 3 ngôn ngữ tiếng Hàn / tiếng Việt / tiếng Anh.

> Hướng dẫn này được sử dụng khi **người phụ trách của khách hàng** dùng cổng thông tin. Đây là tài liệu riêng biệt với hướng dẫn ERP nội bộ dành cho nhân viên (Tập A).

---

# 1. Bắt đầu — Kết nối và đăng nhập

## 1.1 Kết nối cổng thông tin

Truy cập địa chỉ cổng thông tin do người phụ trách Tellustech cung cấp trên trình duyệt (Chrome / Safari / Edge).

```
https://portal.tellustech.co.kr
```

> Vui lòng kiểm tra tên miền chính xác với người phụ trách. Tên miền này tách biệt với tên miền dành cho nhân viên nội bộ.

## 1.2 Giá trị nhập đăng nhập — Sẽ chảy đi đâu

| Mục nhập | Ví dụ | **Giá trị này làm gì trong hệ thống** |
|---|---|---|
| **Mã khách hàng** | `CL-260101-001` | Khớp với `Client.clientCode` trong DB → ID khách hàng của bạn được cố định trong phiên. Sau đó tất cả các màn hình lọc dữ liệu theo ID này |
| **Mật khẩu** | (do người phụ trách cấp) | So sánh hash bcrypt. Nếu khớp thì cấp JWT, nếu sai 5 lần thì khóa tạm thời |
| **Ngôn ngữ** | Tiếng Hàn / Tiếng Việt / English | Lưu vào `User.language` → áp dụng ngay lập tức cho tất cả nhãn · thông báo trên màn hình. Bản thân dữ liệu được lưu cùng nhau ở cột 3 ngôn ngữ |

**Kết quả nhập:**
- Đăng nhập thành công → Cấp cookie `JWT` (`tts_session`), chuyển đến trang chính `/portal`.
- Tất cả dữ liệu hiển thị sau khi đăng nhập (hợp đồng IT · tình trạng yêu cầu, v.v.) sẽ tự động được lọc theo ID khách hàng của bạn. Dữ liệu của công ty khác sẽ không bao giờ bị lộ.
- Nếu nhập sai mật khẩu 5 lần thì tài khoản sẽ bị khóa tạm thời (cần người phụ trách mở khóa).

> **Không cần nhập mã công ty (TV/VR).** Pháp nhân Tellustech mà quý công ty giao dịch là TV hay VR đã được liên kết sẵn trong mã khách hàng nên sẽ tự động định tuyến.

## 1.3 Vào màn hình đăng nhập

Trên trang đăng nhập, nhấn nút **🛒 Đăng nhập Cổng Khách hàng / Customer Portal** ở dưới cùng màn hình, hoặc nếu URL được cung cấp có gắn tham số `?portal=1` thì biểu mẫu chế độ cổng thông tin sẽ tự động hiển thị (ô nhập mã công ty biến mất và đổi thành "Mã khách hàng").

## 1.4 Quên mật khẩu

Nếu quý khách quên mật khẩu, vui lòng liên hệ người phụ trách Tellustech để yêu cầu đặt lại. Vì lý do bảo mật, chúng tôi không cung cấp tự đặt lại (cổng thông tin không gửi liên kết đặt lại dựa trên email — nhằm ngăn chặn giả mạo).

---

# 1.4.5 Chính sách thành viên (NEW)

## Một khách hàng = Một ID cổng thông tin

ID đăng nhập cổng thông tin được cấp cho quý công ty (khách hàng) là **một**. Nếu có nhiều người phụ trách trong cùng một công ty sử dụng, hãy để một người phụ trách IT quản lý mật khẩu và ID, chia sẻ khi cần thiết.

> **Tại sao chỉ cấp một?**
> Tất cả hoạt động như AS · yêu cầu vật tư · yêu cầu báo giá · khảo sát đều được tích lũy theo đơn vị một khách hàng. Nếu cấp nhiều ID, cùng một hoạt động có thể bị tích lũy trùng lặp, hoặc bị phân tán khiến khó truy trách nhiệm. Ngoài ra, điểm được xử lý như tài sản của khách hàng (công ty) nên được tích hợp sử dụng theo đơn vị công ty như trừ vào tiền hóa đơn.

## Không có tự đăng ký thành viên

Cổng thông tin sử dụng **phương thức cấp bởi quản trị viên**. Khi đăng ký khách hàng mới, Tellustech sẽ cấp ID và chuyển đến người phụ trách IT. Khi quên mật khẩu, không có tự đặt lại, vui lòng liên hệ người phụ trách để được cấp lại (mục đích ngăn giả mạo).

## Điểm là tài sản của khách hàng

Dù một nhân viên yêu cầu báo giá và được tích lũy +1,000d, hay nhân viên khác trả lời khảo sát và được tích lũy +10,000d, **tất cả đều được tích lũy vào một số dư duy nhất của khách hàng**. Khi sử dụng cũng theo đơn vị công ty (cá nhân không thể lấy đi).

## Chính sách sử dụng điểm — Quyết định khi ký hợp đồng (NEW)

Để đáp ứng tuân thủ của các tập đoàn lớn (cấm nhận phiếu quà tặng cá nhân, v.v.), **phương thức sử dụng điểm được quyết định tại thời điểm ký hợp đồng**.

| Chính sách | Ý nghĩa |
|---|---|
| **❌ Chưa thiết lập (NONE)** | Chỉ tích lũy, không thể đổi — chờ quyết định chính sách |
| **💰 Chỉ trừ vào hóa đơn** | Chỉ có thể trừ tự động vào tiền hóa đơn của hợp đồng IT/doanh thu lần sau |
| **🎫 Chỉ phiếu quà tặng** | Chỉ có thể nhận gifticon |
| **✅ Cả hai** | Có thể tự chọn khi đăng ký |

Chính sách của quý công ty được hiển thị qua thông báo ở trang điểm khi nhấn 🏆 trên thanh bên ("Phương thức sử dụng theo hợp đồng: Chỉ trừ vào hóa đơn"). Các tùy chọn không phù hợp với chính sách sẽ **tự động được ẩn**.

> Nếu cần thay đổi chính sách, vui lòng liên hệ người phụ trách kinh doanh.

---

# 1.5 Thanh bên (NEW — Phase A áp dụng)

Sau khi đăng nhập, **thanh bên 3 nhóm** sẽ hiển thị ở bên trái (PC) hoặc menu hamburger ☰ ở trên cùng (di động).

## 1.5.1 Thanh bên PC (chiều ngang ≥ 768px)

```
┌─────────────────────────┐
│ TELLUSTECH PORTAL    ◀  │ ← Nút thu gọn
│ Tên công ty             │
│ 🏆 87,000d              │ ← Số dư điểm (nhấn → /portal/points)
│                          │
│ ── Bộ phận OA ──     ▼  │ ← Thu gọn/mở rộng phần
│ 📠 [Banner quảng cáo OA]│
│   Tình trạng thuê       │
│   Yêu cầu AS            │
│   Yêu cầu vật tư        │
│   Xác nhận sử dụng      │
│                          │
│ ── Bộ phận đo lường ─ ▼ │
│ 🔬 [Banner quảng cáo TM]│
│   Thuê / sửa / hiệu... │
│                          │
│ ── Giao tiếp ──      ▼  │
│ 💬 Yêu cầu báo giá      │
│ 🤝 Giới thiệu đối tác   │
│ 🌟 Khen ngợi·CT·ĐX      │
│ 📰 Tin tức              │
│ 📊 Khảo sát             │
│                          │
│ 🇻🇳 🇺🇸 🇰🇷  ☀/🌙     │ ← Ngôn ngữ/giao diện
│ [Đăng xuất]             │
│ [🏢 Đăng nhập nội bộ]   │
└─────────────────────────┘
```

- **◀** Nút thu gọn → chỉ hiện biểu tượng 64px (nhấn ▶ lại để mở rộng)
- Nhấn vào tiêu đề phần **▼/▶** để mở rộng · thu gọn theo nhóm. Trạng thái được duy trì sau khi tải lại (localStorage).
- Nhóm của trang hiện tại sẽ tự động được mở rộng.
- **🏢 Đăng nhập nhân viên nội bộ** — Khi chuyển sang ERP nội bộ của cùng hệ thống (sau khi tự động đăng xuất sẽ chuyển đến màn hình đăng nhập nội bộ).

## 1.5.2 Menu hamburger di động (chiều ngang < 768px)

Trên smartphone, thanh bên sẽ tự động được ẩn và menu hamburger xuất hiện ở trên cùng.

```
┌──────────────────────────┐
│ ☰  TELLUSTECH  🏆 87,000d │
└──────────────────────────┘
```

- Nhấn **☰** → drawer 280px xuất hiện trượt vào (slide-in) từ bên trái.
- Khi nhấn vào mục menu, drawer sẽ tự động đóng.
- Có thể xoay (ngang/dọc) tự do — manifest được thiết lập là `orientation: any`.

## 1.5.3 Banner quảng cáo (dưới tiêu đề bộ phận)

Văn bản `📠 OA quảng cáo / 🔬 TM quảng cáo` là quảng cáo một dòng mà quản trị viên Tellustech có thể thay đổi. Khi nhấn sẽ mở trang chủ công ty (ví dụ: tellustech.co.kr/oa) trong tab mới.

---

# 2. Xem nhanh màn hình chính

**Màn hình chính** hiển thị ngay sau khi đăng nhập gồm 4 khu vực.

## 2.1 Header — Tên công ty / Mã khách hàng

Tên công ty và mã khách hàng (`CL-...`) của quý công ty được hiển thị ở phía trên màn hình.
Nếu ở trạng thái **đình chỉ do nợ phải thu** (chậm thanh toán, v.v.), huy hiệu màu đỏ `Đình chỉ / Bị khóa` sẽ hiển thị, và việc tạo yêu cầu AS · vật tư mới sẽ bị tạm thời vô hiệu hóa. Việc giải tỏa được tự động xử lý sau khi xác nhận thanh toán hoặc vui lòng liên hệ người phụ trách.

## 2.2 Thẻ yêu cầu nhanh — 4 cái

- 🛠 **Yêu cầu AS / Yêu cầu BH**
- 📦 **Yêu cầu vật tư / Yêu cầu vật tư**
- ✍️ **Xác nhận sử dụng / Xác nhận sử dụng**
- 📄 **Chứng chỉ hiệu chuẩn / Chứng chỉ** (số trong ngoặc là số lượng có thể tải)

Nhấn vào mỗi mục sẽ chuyển đến màn hình tương ứng.

## 2.3 Thẻ hợp đồng IT của tôi

Hiển thị 10 hợp đồng IT đang hoạt động/sắp đến hạn gần nhất theo thứ tự số hợp đồng. Mỗi dòng hiển thị cùng nhau **số hợp đồng**, **trạng thái** (`ACTIVE` / `DRAFT`, v.v.), **số lượng thiết bị**.

## 2.4 Bảng tình trạng yêu cầu của tôi

Tình trạng tiến độ của 20 yêu cầu AS · vật tư đăng ký gần đây nhất. Trôi qua 4 giai đoạn.

| Giai đoạn | Giá trị DB | Ý nghĩa | Ai thay đổi |
|---|---|---|---|
| **Yêu cầu / Yêu cầu** | `RECEIVED` | Tiếp nhận hoàn tất, chờ phân công người phụ trách | Tự động (tại thời điểm đăng ký) |
| **Đang xử lý / Đang xử lý** | `IN_PROGRESS` | Phân công người phụ trách · đang tiến hành công việc | Người phụ trách Tellustech thay đổi |
| **Hoàn tất / Hoàn tất** | `COMPLETED` | Hoàn tất công việc, chờ khách hàng xác nhận | Người phụ trách Tellustech hoàn tất điều phối + ký |
| **Đã xác nhận / Đã xác nhận** | `CONFIRMED` | Khách hàng đã xác nhận → kết thúc | **Quý công ty** nhấn nút "Xác nhận" |

### Nút "Xác nhận" làm gì

Nút **Xác nhận** chỉ được kích hoạt ở bên phải dòng có trạng thái `COMPLETED`. Khi nhấn nút này:

1. Gọi API `POST /api/portal/tickets/{id}/confirm`.
2. Kiểm tra máy chủ: Có phải ticket của khách hàng của bạn không? Trạng thái hiện tại có phải `COMPLETED` không?
3. Nếu vượt qua → cập nhật `status = CONFIRMED`, `confirmedAt = bây giờ` → kết thúc công việc.
4. Trang sẽ tự động tải lại và dòng được cập nhật thành "Đã xác nhận".

> Một khi đã xác nhận thì không thể hoàn tác. Nếu có khiếu nại về kết quả công việc, vui lòng liên hệ người phụ trách Tellustech **trước khi nhấn nút xác nhận**.

---

# 3. Yêu cầu AS

Sử dụng khi thiết bị bị hỏng hoặc cần kiểm tra.

## 3.1 Mức độ ảnh hưởng dữ liệu theo giá trị nhập

| Mục nhập | Nguồn / Giá trị | **Giá trị này làm gì trong hệ thống** |
|---|---|---|
| **SN thiết bị** (dropdown) | Danh sách thiết bị đang hoạt động của bạn được trả về bởi `/api/portal/my-equipment` | SN được chọn được lưu vào `AsTicket.serialNumber` → người phụ trách Tellustech tra cứu ngay lập tức hợp đồng · lịch sử · hồ sơ hiệu chuẩn của thiết bị đó |
| **Ngôn ngữ gốc** (VI/KO/EN) | Radio / Select | Lưu vào `AsTicket.originalLang`. Tiêu chí để hệ thống xác định khi tự động dịch nên xem ngôn ngữ nào là gốc |
| **Triệu chứng (VI/KO/EN)** 1 trong 3 ô | Văn bản tự do | Khi lưu, Claude API tự động dịch sang 2 ngôn ngữ còn lại → điền đầy đủ vào 3 cột `symptomVi` / `symptomEn` / `symptomKo`. Kết quả: Người phụ trách Việt Nam đọc nội dung được viết bằng tiếng Hàn bằng tiếng Việt, trụ sở Anh đọc bằng tiếng Anh ngay lập tức |

**Định dạng hiển thị trong dropdown:**
```
SN-12345 · ITM-260101-001 LaserPrinter X7500 (TLS-260101-001)
```
Theo thứ tự là **Số sê-ri · Mã hàng Tên hàng (Số hợp đồng)**.

**SN nào hiển thị trong dropdown:**
- Thiết bị đã đăng ký trong hợp đồng IT đang hoạt động (`itContractEquipment.removedAt = null`) + thiết bị của TM rental trước khi kết thúc (`tmRentalItem.endDate >= hôm nay`).
- Do đó, các thiết bị đã thu hồi · thay thế sẽ tự động biến mất, và các thiết bị mới đăng ký sẽ tự động hiển thị (sau khi tải lại trang).

## 3.2 Quy tắc xác thực giá trị nhập (tại thời điểm lưu)

| Xác thực | Nếu thất bại |
|---|---|
| Phải có văn bản trong **ít nhất 1** trong 3 ô triệu chứng | Lỗi `invalid_input`, hiển thị "Hãy nhập triệu chứng" |
| Phiên khách hàng của bạn (vai trò=CLIENT) | Lỗi `client_only` — không xảy ra trong luồng bình thường |
| Cũng cho phép nhập SN tự do | SN không có trong dropdown vẫn được lưu nguyên (như thiết bị mang từ bên ngoài, v.v.) |

## 3.3 Điều xảy ra sau khi tiếp nhận

Khi nhấn nút **Tiếp nhận AS / Tiếp nhận BH**, hệ thống thực hiện những việc sau cùng một lúc.

1. **Tự động cấp số ticket** — Định dạng `YY/MM/DD-NN` (ví dụ: `26/04/27-01`) — số thứ tự của ngày đó.
2. **Tạo ticket** — `kind = AS_REQUEST`, `status = RECEIVED`, tự động điền ngày giờ tiếp nhận · ID khách hàng của bạn.
3. **Lưu trữ dịch 3 ngôn ngữ** — Hai ô ngôn ngữ chưa nhập sẽ được tự động dịch và lưu.
4. **Thông báo nội bộ** — Thông báo ngay lập tức cho người phụ trách AS Tellustech (hiển thị huy hiệu chưa đọc màu đỏ trên màn hình "Tiếp nhận AS" của ERP nội bộ).
5. **Thông báo khách hàng** — Gửi tin nhắn "Tiếp nhận hoàn tất — Số 26/04/27-01" qua email hoặc KakaoTalk đã đăng ký.
6. **Cập nhật màn hình chính** — Hiển thị ngay dưới dạng dòng mới trong "Tình trạng yêu cầu của tôi".

## 3.4 Hành vi chặn khi đình chỉ do nợ phải thu (BLOCKED)

Nếu khách hàng quý công ty ở trạng thái `BLOCKED`:
- Thẻ nhanh "Yêu cầu AS" hiển thị màu xám + gạch ngang.
- Khi cố gắng nhập URL trực tiếp, API từ chối với `403 receivable_blocked`.
- Khi xác nhận thanh toán, trạng thái khách hàng tự động trở lại `WARNING` hoặc `NORMAL` → menu cũng được kích hoạt ngay lập tức.

---

# 4. Yêu cầu vật tư tiêu hao

Yêu cầu vật tư tiêu hao định kỳ như mực, ruy băng, linh kiện.

## 4.1 Mức độ ảnh hưởng dữ liệu theo giá trị nhập

| Mục nhập | Nguồn / Giá trị | **Giá trị này làm gì trong hệ thống** |
|---|---|---|
| **Hàng** (dropdown) | `/api/portal/my-supplies` — kết quả ánh xạ tương thích (`ItemCompatibility`) của thiết bị đang hoạt động của bạn | itemId được chọn được lưu vào dòng. itemId không có trong danh sách trắng tương thích sẽ bị máy chủ từ chối với `not_compatible` |
| **Số lượng** | Số nguyên ≥ 1 | Lưu vào `quantity` của dòng. Người phụ trách xuất kho Tellustech xử lý đặt hàng · xuất kho theo giá trị này |
| **Ghi chú** (tùy chọn) | Văn bản tự do | Lưu vào `note` của dòng. Truyền trực tiếp cho người phụ trách những điều như màu sắc · model · mức độ khẩn cấp |

## 4.2 Cách quyết định ánh xạ tương thích

Các mục hiển thị trong dropdown được tính theo luồng tương đương với SQL sau.

```
Tập hợp itemId của thiết bị đang hoạt động của bạn (PRODUCT)
   ↓
Ánh xạ (productItemId, consumableItemId) trong bảng ItemCompatibility
   ↓
Tập hợp consumableItemId = ứng viên hiển thị dropdown
```

Do đó:
- Ngay cả khi **đăng ký thiết bị mới**, nếu ánh xạ tương thích không được đăng ký cùng thì có thể không thấy vật tư mới → yêu cầu người phụ trách đăng ký ánh xạ.
- Khi **thu hồi thiết bị**, vật tư chuyên dụng của thiết bị đó nếu không chung với thiết bị khác sẽ tự động biến mất khỏi dropdown.
- Ánh xạ tương thích được Tellustech quản lý trực tiếp tại màn hình quản trị (`/admin/item-compatibility`).

## 4.3 Nhập nhiều dòng

Bằng nút `+ Thêm mặt hàng / Thêm vật tư`, có thể chứa nhiều mặt hàng cùng nhau trong một yêu cầu. **Tất cả các dòng được gói chung trong một số tiếp nhận** — người phụ trách xuất kho xử lý bằng một lần xuất kho.

## 4.4 Điều xảy ra sau khi tiếp nhận

Khi nhấn nút **Gửi yêu cầu / Gửi yêu cầu**:

1. **Xác thực tính tương thích từng dòng** — Nếu có một dòng hàng ngoài tương thích thì toàn bộ bị từ chối (`not_compatible` + hiển thị itemId tương ứng).
2. **Cấp số tiếp nhận** — Định dạng `YY/MM/DD-NN` (chia sẻ chuỗi giống AS).
3. **Tạo ticket** — `kind = SUPPLIES_REQUEST`, `status = RECEIVED`, thông tin dòng được lưu vào cột JSON `suppliesItems`.
4. **Tự động tạo tin nhắn tóm tắt** — Hiển thị trên màn hình đầu theo dạng "[Yêu cầu vật tư] Mực đen trắng × 2, Mực màu × 1".
5. **Thông báo nội bộ** — Thông báo cho người phụ trách xuất kho Tellustech.
6. **Cập nhật màn hình chính** — Hiển thị ngay trong "Tình trạng yêu cầu của tôi" (cột loại đánh dấu "📦 vật tư").

> Khi đình chỉ do nợ phải thu (`BLOCKED`), thẻ nhanh sẽ bị vô hiệu hóa giống như AS.

---

# 5. Xác nhận sử dụng (NEW — Liên kết tự động thu thập SNMP)

Kiểm tra và ký · xác nhận lượng sử dụng IT (máy in · máy đa năng) hàng tháng.

## Quy trình mới (từ 2026-04)

Cũ: Quản trị viên nhập thủ công bộ đếm → phát hành hóa đơn
**Mới**: Agent tự động thu thập hàng tháng → tự động tạo Phiếu xác nhận sử dụng (UC) → thông báo → khách hàng ký → PDF → doanh thu

### Luồng tự động thu thập
1. Agent được cài đặt trên PC văn phòng tự động thu thập bộ đếm SNMP vào [ngày thu thập] hàng tháng (khác nhau theo hợp đồng, mặc định ngày 25)
2. ERP tự động tạo "Phiếu xác nhận sử dụng (UC-YYMMDD-###)" (status=COLLECTED)
3. Cron 03:00 KST hôm sau gửi thông báo đến khách hàng (status=CUSTOMER_NOTIFIED)
4. Hiển thị "Chờ xác nhận" trên thông báo thanh bên cổng thông tin + màn hình chính
5. Khách hàng nhấn [Xác nhận] → xem xét lượng sử dụng/phí theo từng thiết bị → ký → xác nhận (status=CUSTOMER_CONFIRMED)
6. Quản trị viên xem xét → tạo PDF → phát hành phiếu doanh thu → tự động phát sinh nợ phải thu

### Màn hình mới — Thẻ chi tiết theo thiết bị

Mỗi thiết bị của hợp đồng IT hiển thị thẻ riêng biệt:

```
┌─ Thiết bị 1: Samsung SCX-8123 (SEC30CDA760C1FD) ─┐
│              │ Đen trắng │ Màu  │
│ Sử dụng tích lũy│ 70,767 │  —   │
│ Sử dụng tháng trước│ 69,500 │ —  │
│ Sử dụng tháng này│  1,267 │  —  │
│ Phí cơ bản           500,000₫  │
│ Bao gồm cơ bản (B/W) 1,000 trang│
│ Sử dụng thêm (B/W)     267 trang│
│ Phí thêm (@500₫)     133,500₫  │
│ ────────────────────────────  │
│ Tạm tính              633,500₫  │
└────────────────────────────────┘

(N thiết bị → N thẻ)

═══════════════════════════════
Tổng cộng: 1,433,500₫
[✍️ Ký]  [Xác nhận]  → Tích lũy +1,000d!
```

### ⚠ Phát hiện bất thường bộ đếm

Nếu giá trị giảm bất thường (do thay mainboard, v.v.) hoặc tính ra lượng sử dụng nhỏ hơn 0, sẽ có dấu ⚠. **Trước khi xác nhận**, vui lòng liên hệ người phụ trách Tellustech.

## 5.1 Dữ liệu hiển thị — Đến từ đâu

Mỗi dòng hiển thị trên màn hình là 1 **dòng hóa đơn hàng tháng (`itMonthlyBilling`)** mà nhân viên nội bộ đã đăng ký. Tự động chỉ hiển thị các hóa đơn hợp đồng IT của khách hàng của bạn.

| Cột | Nguồn / Ý nghĩa |
|---|---|
| **Tháng / Tháng** | `billingMonth` (ví dụ: `2026-04`) — Người phụ trách Tellustech đăng ký hàng tháng |
| **S/N** | Số sê-ri của thiết bị IT mà hóa đơn đó chỉ đến |
| **Đen trắng / B&W** | `counterBw` — Giá trị tích lũy mà người phụ trách nội bộ đã kiểm tra và nhập |
| **Màu / Color** | `counterColor` — Tương tự |
| **Số tiền / Phí** | `computedAmount` — Hệ thống tự động tính toán bằng chênh lệch bộ đếm × đơn giá |

## 5.2 Mức độ ảnh hưởng dữ liệu theo giá trị nhập

| Nhập / Hành động | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **✍️ Ký** (vẽ canvas) | Vết ngón tay/chuột được chuyển thành PNG (data URL) và chỉ giữ trong bộ nhớ — chưa lưu vào DB |
| Nút **Xác nhận / Xác nhận** | PNG chữ ký được gửi qua API → lưu vào cột `itMonthlyBilling.customerSignature` → dòng hóa đơn đó bị khóa (không thể ký lại) → kích hoạt tự động phát sinh nợ phải thu của ERP nội bộ |

## 5.3 Quy trình ký bằng ngón tay trên di động

1. Nhấn nút **✍️ Ký / Ký tên** ở bên phải dòng hóa đơn → mở modal chữ ký.
2. Vẽ chữ ký bằng chuột (hoặc ngón tay smartphone) trong vùng trắng của modal.
3. Lưu chữ ký bằng nút **Xác nhận** của modal. (Modal đóng và dòng hiển thị ✓)
4. Khi nhấn nút **Xác nhận / Xác nhận** trong dòng bảng, chữ ký được gửi đến máy chủ và xác nhận hoàn tất.

## 5.4 Quy tắc xác thực (tại thời điểm lưu)

| Xác thực | Nếu thất bại |
|---|---|
| Chỉ có thể xác nhận dòng hóa đơn của khách hàng của bạn | Lỗi `forbidden` |
| Không thể ký lại dòng đã ký | Hiển thị lỗi `already_confirmed` |
| Vô hiệu hóa nút "Xác nhận" khi thiếu chữ ký | Bị chặn ở phía client |

## 5.5 Điều xảy ra sau khi xác nhận

1. Dòng hóa đơn bị khóa (`customerSignature` not null).
2. Trong module nợ phải thu của ERP nội bộ, số tiền hóa đơn đó được tự động tạo thành **nợ phải thu mới** (`PayableReceivable`, `kind=RECEIVABLE`, `status=OPEN`).
3. Ngày đáo hạn thanh toán được tính tự động theo điều kiện thanh toán của master khách hàng (ví dụ: 30 ngày).
4. Bắt đầu chịu ảnh hưởng của chính sách đóng kế toán (khóa).

## 5.6 Không liên quan đến trạng thái đình chỉ (BLOCKED)

Xác nhận sử dụng luôn có thể sử dụng bất kể trạng thái đình chỉ do nợ phải thu — vì bản thân việc xác nhận là quy trình "xác định số liệu" tách biệt với thanh toán.

> Một khi đã xác nhận thì không thể chỉnh sửa. Nếu có khiếu nại về giá trị bộ đếm, **bắt buộc phải liên hệ người phụ trách Tellustech trước khi xác nhận**.

---

# 6. Tải xuống chứng chỉ hiệu chuẩn

Tìm kiếm · tải xuống PDF chứng chỉ của thiết bị đã hoàn tất công việc hiệu chuẩn (kiểm chuẩn).

## 6.1 Mức độ ảnh hưởng dữ liệu theo giá trị nhập

Mỗi điều kiện tìm kiếm được thêm vào truy vấn máy chủ dưới dạng điều kiện AND khớp một phần (`contains`). Nếu để trống tất cả và nhấn "Tra cứu", tất cả chứng chỉ của khách hàng của bạn sẽ hiển thị theo ngày phát hành giảm dần.

| Điều kiện | Cột khớp | **Hành vi tìm kiếm** |
|---|---|---|
| **S/N** | `SalesItem.serialNumber` | Khớp một phần (không phân biệt hoa thường) — ví dụ: nhập `SN-12` thì khớp tất cả `SN-12345`, `ASN-12`, v.v. |
| **Số chứng chỉ** | `SalesItem.certNumber` | Khớp một phần |
| **Hàng** | `Item.itemCode` hoặc `Item.name` | Khớp một phần — bất kỳ mã/tên |
| **Ngày bắt đầu** | `SalesItem.issuedAt >= ngày bắt đầu` | Giới hạn dưới ngày phát hành |
| **Ngày kết thúc** | `SalesItem.issuedAt <= ngày kết thúc` | Giới hạn trên ngày phát hành |

## 6.2 Dòng nào là đối tượng tìm kiếm — Lọc tự động

Dữ liệu mà màn hình này hiển thị là các dòng doanh thu thỏa mãn đồng thời 4 điều kiện sau.

1. `Sales.clientId` = khách hàng của bạn (tự động — dữ liệu khách hàng khác tuyệt đối không hiển thị)
2. `Sales.project.salesType` = `CALIBRATION` (chỉ dự án hiệu chuẩn)
3. **Có ít nhất một** trong `SalesItem.certNumber` hoặc `SalesItem.certFileId` có giá trị
4. (Thêm vào trên) Điều kiện tìm kiếm trên màn hình khớp

Do đó, dòng doanh thu thông thường (như `TRADE`) hoặc dòng hiệu chuẩn chưa tải PDF lên sẽ không được hiển thị.

## 6.3 Bảng kết quả

| Cột | Ý nghĩa |
|---|---|
| **Ngày phát hành** | `SalesItem.issuedAt` |
| **Số chứng chỉ** | `SalesItem.certNumber` |
| **S/N** | `SalesItem.serialNumber` |
| **Hàng** | `itemCode · name` |
| **Hạn tiếp theo** | `SalesItem.nextDueAt` — Ngày khuyến nghị kiểm chuẩn định kỳ tiếp theo |
| **Tải xuống** | Nút 📄 PDF — chỉ hiển thị khi có `certFileId` |

## 6.4 Hành vi tải xuống

Khi nhấn nút 📄 PDF, `/api/files/{certFileId}` sẽ mở trong cửa sổ mới.
- Chỉ có thể tải xuống tệp của khách hàng của bạn — ngay cả khi cố gắng nhập URL trực tiếp tệp của ID khách hàng khác cũng bị từ chối với `403`.
- Khi tệp được mở, có thể lưu cục bộ qua menu in · tải xuống của trình duyệt.
- Giá trị N của "📄 Chứng chỉ hiệu chuẩn ({N})" trên màn hình chính giống với tổng số bản ghi mà màn hình này có thể hiển thị.

---

# 7. 6 loại bảng tình trạng dịch vụ (NEW)

Kiểm tra **hợp đồng + tình trạng thanh toán** của tất cả dịch vụ OA · thiết bị đo lường tại một màn hình.

## 7.1 6 loại dịch vụ

| Menu | Đường dẫn | Dữ liệu |
|---|---|---|
| 📠 Tình trạng cho thuê OA | `/portal/oa/rentals` | Hợp đồng IT + thiết bị + hóa đơn hàng tháng |
| 🔬 Tình trạng cho thuê TM | `/portal/tm/rentals` | TM rental + dòng thiết bị + doanh thu |
| 🔧 Tình trạng sửa chữa | `/portal/tm/repairs` | Theo từng doanh thu sửa chữa |
| 📐 Tình trạng hiệu chuẩn | `/portal/tm/calibrations` | Doanh thu hiệu chuẩn + chứng chỉ |
| 🛠️ Tình trạng bảo trì | `/portal/tm/maintenance` | Hợp đồng bảo trì + phân bổ tháng |
| 💼 Tình trạng mua bán | `/portal/tm/purchases` | Lịch sử mua hàng mới · hàng cũ |

## 7.2 Cấu trúc màn hình — Chung

Mỗi bảng tình trạng có cùng một mẫu.

### (Khi có) Hợp đồng / cho thuê của tôi — Mở rộng dạng thẻ
```
TLS-260426-007  🟢ACTIVE  5 cái  2026-01-01 ~ 2027-12-31  ▶
```
Nhấn ▶ → mở rộng dòng thiết bị (S/N · tên hàng · phí hàng tháng · ngày lắp đặt).

### Tình trạng thanh toán — Bảng

| Cột | Ý nghĩa |
|---|---|
| **Tháng / Bản** | Tháng hóa đơn hoặc số phiếu |
| **Số tiền hóa đơn** | `PayableReceivable.amount` |
| **Ngày dự kiến** | `revisedDueDate ?? dueDate` (ưu tiên ngày thay đổi) |
| **Ngày thực tế thanh toán** | Ngày chuyển tiền cuối cùng nếu `status=PAID` |
| **Số ngày còn lại** | `Ngày dự kiến - hôm nay`. Âm=số ngày còn lại (xanh), 0=hôm nay (vàng), Dương=số ngày quá hạn (đỏ) |
| **Trạng thái** | `🟢 chưa đến / 🟡 hôm nay / 🟠 sắp đến (±3 ngày) / 🔴 quá hạn / ✅ đã thanh toán đầy đủ` |

### Tóm tắt (dưới bảng)
- **Tổng chưa thanh toán**: Số bản và số tiền chưa thanh toán
- **Quá hạn**: Số bản và số tiền quá hạn (màu đỏ nếu có)

## 7.3 Khi không có dữ liệu

Nếu không có lịch sử sử dụng, hiển thị thông báo hướng dẫn + nút CTA **[Yêu cầu báo giá]** — khi nhấn sẽ chuyển đến trang yêu cầu báo giá với loại dịch vụ tương ứng được tự động điền sẵn.

---

# 8. Yêu cầu báo giá (NEW)

Yêu cầu báo giá ngay lập tức cho thuê IT mới, thuê thiết bị đo lường, hiệu chuẩn, sửa chữa, mua bán, bảo trì.

## 8.1 Mức độ ảnh hưởng dữ liệu theo giá trị nhập

| Nhập | Trường DB | Hiệu ứng |
|---|---|---|
| **Loại** | `quoteType` (RENTAL_IT/RENTAL_TM/CALIBRATION/REPAIR/PURCHASE/MAINTENANCE/OTHER) | Tiêu chí phân công tự động người phụ trách kinh doanh |
| **Tiêu đề** (≥ 1 ngôn ngữ trong KO/VI/EN) | `titleKo/Vi/En` | Ngôn ngữ chưa nhập sẽ được Claude API tự động dịch |
| **Mô tả chi tiết** | `descriptionKo/Vi/En` | Tự động dịch tương tự |
| **Số lượng mong muốn / Ngày bắt đầu / Ngày kết thúc** | `quantity / desiredStartDate / desiredEndDate` | Người phụ trách kinh doanh tham khảo khi soạn báo giá |

## 8.2 Luồng sau khi tiếp nhận

1. **Tự động cấp mã** — `QR-YYMMDD-###`
2. **Trạng thái = REQUESTED** → Chờ phân công người phụ trách kinh doanh
3. Người phụ trách kinh doanh Tellustech soạn PDF báo giá + số tiền → **Trạng thái = QUOTED**
4. Nút [Chấp nhận] / [Từ chối] được kích hoạt trên màn hình khách hàng
5. Khi chấp nhận `Trạng thái = ACCEPTED` → Người phụ trách kinh doanh chuyển đổi sang hợp đồng IT/TM rental/doanh thu
6. **Tích lũy điểm**: +1,000d tự động ngay tại thời điểm yêu cầu

## 8.3 Lịch sử báo giá của tôi

Tất cả báo giá đã yêu cầu được quản lý dưới dạng bảng — Ngày yêu cầu, mã (`QR-...`), loại, trạng thái, số tiền báo giá, hành động (chấp nhận/từ chối).

---

# 9. Khen ngợi / Cải tiến / Đề xuất (NEW)

Đăng ý kiến về dịch vụ hoặc nhân viên.

## 9.1 Chọn loại

| Loại | Ý nghĩa | Điểm |
|---|---|---|
| 🌟 **Khen ngợi (PRAISE)** | Khen ngợi sự phục vụ tốt của cá nhân nhân viên | +1,000d |
| 🔧 **Cải tiến (IMPROVE)** | Điểm cần cải thiện trong dịch vụ hiện tại | +1,000d |
| 💡 **Đề xuất (SUGGEST)** | Ý tưởng tính năng · dịch vụ mới | +1,000d |

## 9.2 Soạn thảo

- Chọn loại → soạn nội dung (≥ 1 ngôn ngữ trong KO/VI/EN). Được tự động dịch.
- Khi khen ngợi có thể chọn **nhân viên đối tượng** (danh sách người phụ trách AS · kinh doanh của khách hàng của bạn).
- Sau khi đăng ký, mã `FB-YYMMDD-###` được cấp.

## 9.3 Trả lời

Khi Tellustech soạn câu trả lời, hộp trả lời sẽ được hiển thị thêm ở dưới thẻ ý kiến (3 ngôn ngữ).

---

# 10. Tin tức (Bảng tin CMS) (NEW)

Bảng tin tổng hợp tin tức marketing, thông báo công ty, tin tức Hàn Quốc · Việt Nam · ngành, mẹo sử dụng, bài viết cộng đồng khách hàng.

## 10.1 Tab danh mục

Tất cả / MARKETING / COMPANY_NEWS / KOREA_NEWS / VIETNAM_NEWS / INDUSTRY_NEWS / TIP / COMMUNITY

## 10.2 Xem bài đăng

- Nhấn vào thẻ → nội dung được mở rộng dưới thẻ.
- Nếu có **URL nguồn** trong nội dung, sẽ tự động hiển thị dưới dạng liên kết có thể nhấp.
- Có thể có hướng dẫn **Bản nháp tự động tạo bằng AI** ở cuối nội dung — trong trường hợp đó có thể được chỉnh sửa sau khi xác minh thực tế.
- Bài đăng được đánh dấu **Ghim trên cùng (📌)** luôn ở trên cùng.

## 10.3 Điểm thưởng

- Một số bài đăng có gắn huy hiệu `+N d` (do quản trị viên thiết lập).
- Tự động tích lũy 1 lần khi đọc lần đầu — đọc lại sau đó không tích lũy.
- Tích lũy ngay lập tức cập nhật số dư 🏆 trên thanh bên.

## 10.4 Soạn bài viết cộng đồng (tùy chọn)

Danh mục `COMMUNITY` cho phép khách hàng cũng có thể soạn bài viết (sẽ kích hoạt khi vận hành Phase C). Tích lũy +1,000d ngay khi soạn.

---

# 11. Khảo sát (NEW)

Trả lời các khảo sát do Tellustech phát hành như khảo sát mức độ hài lòng của khách hàng.

## 11.1 Thẻ khảo sát đang tiến hành

Mỗi thẻ khảo sát:
- Tiêu đề, thời gian thực hiện (bắt đầu ~ kết thúc)
- Hiển thị phần thưởng **🏆 +10,000d**
- Nút **[Tham gia]** (hoặc "Đã tham gia" nếu đã tham gia)

## 11.2 Modal tham gia

Loại câu hỏi:
- **RATING** — Chọn điểm 1~5
- **CHOICE** — Chọn duy nhất trong các lựa chọn
- **TEXT** — Văn bản tự do (được tự động dịch)

Khi gửi [Tham gia]:
1. Xác thực máy chủ → khách hàng của bạn + trong thời gian thực hiện + chưa tham gia
2. Lưu câu trả lời (`SurveyResponse.answers` JSON)
3. **Tự động tích lũy +10,000d** (đơn giá có thể khác nhau theo từng khảo sát)
4. Thông báo toast + cập nhật số dư thanh bên

> **Một khách hàng = 1 lần phản hồi** mà thôi.

---

# 12. Giới thiệu đối tác (NEW)

Giới thiệu đối tác khác mà bạn biết đến Tellustech. Khi phát sinh khoản thanh toán đầu tiên, người giới thiệu được tích lũy **100,000d**.

## 12.1 Mục nhập

| Mục | Bắt buộc |
|---|---|
| Tên công ty | ✓ |
| Tên người phụ trách | ✓ |
| Số điện thoại | ✓ |
| Email | (tùy chọn) |
| Lý do giới thiệu | (tùy chọn) |

> **Chặn tự giới thiệu** — Tên công ty giống với khách hàng của bạn sẽ bị từ chối khi đăng ký (lỗi `self_referral`).

## 12.2 Các giai đoạn tiến hành

| Giai đoạn | Giá trị DB | Ý nghĩa | Điểm |
|---|---|---|---|
| Gửi | SUBMITTED | Đăng ký hoàn tất | — |
| Đã liên lạc | CONTACTED | Người phụ trách kinh doanh đã liên lạc lần đầu | — |
| Đang họp | MEETING | Đang tiến hành họp kinh doanh | — |
| Đã ký hợp đồng | CONTRACTED | Hợp đồng chính thức (chưa thanh toán) | — |
| **Thanh toán đầu tiên** | PAID | Xác nhận chuyển khoản đầu tiên của khách hàng mới | **Tự động tích lũy +100,000d** |
| Từ chối / Hủy bỏ | DECLINED | Dừng tiến hành | — |

> **Tích lũy tại thời điểm thanh toán đầu tiên chứ không phải thời điểm ký hợp đồng** — Thiết kế nhằm chặn rủi ro hợp đồng không tiền mặt hoặc bị hủy.

## 12.3 Lịch sử giới thiệu của tôi

Tất cả các giới thiệu đã yêu cầu được quản lý dưới dạng bảng.

---

# 13. Điểm của tôi (NEW)

Vào bằng `/portal/points` hoặc nhấn 🏆 trên thanh bên.

## 13.1 Số dư + Thanh tiến trình

```
🏆 87,000d
[████████░░░░░░░░░░░░░░░░] 8.7%
Còn 913,000d nữa đến 1,000,000d
[Đổi điểm] (kích hoạt từ 1,000,000d)
```

## 13.2 Lịch sử tích lũy / khấu trừ

Ngày · Lý do · Tích lũy/khấu trừ · (mỗi dòng được tích lũy nên số dư = SUM luôn chính xác).

## 13.3 Hướng dẫn tích lũy (tóm tắt)

| Hoạt động | Đơn giá |
|---|---|
| Yêu cầu AS / Yêu cầu vật tư / Xác nhận dịch vụ / Xác nhận sử dụng | 1,000d |
| Yêu cầu báo giá / Khen ngợi · cải tiến · đề xuất | 1,000d |
| Soạn bài viết cộng đồng | 1,000d |
| Đọc bài đăng thưởng (1 lần) | Khác nhau theo bài |
| Phản hồi khảo sát | 10,000d |
| Thanh toán đầu tiên của đối tác giới thiệu | 100,000d |

> Đơn giá tích lũy có thể được quản trị viên Tellustech thay đổi (phản ánh ngay khi thay đổi chính sách).

## 13.4 Đổi điểm (từ 1,000,000d)

Nhấn nút [Đổi điểm] → Modal:

### Phương thức 1: 💰 Trừ vào tiền hóa đơn
Tự động trừ vào tiền hóa đơn của hợp đồng IT / doanh thu lần sau. Xử lý trong 3 ngày làm việc.

### Phương thức 2: 🎫 Nhận phiếu quà tặng
Gửi gifticon (người phụ trách gửi đến email · điện thoại di động đã đăng ký).

### Đơn vị
- Tối thiểu **1,000,000d**
- Đơn vị **1,000,000d** (2 triệu, 3 triệu, v.v.)
- Trong giới hạn số dư

### Luồng xử lý
1. Đăng ký → Tạo `PortalReward(status=PENDING)`, trừ ngay số dư
2. Quản trị viên Tellustech phê duyệt → `APPROVED` (tiến hành xử lý thực tế)
3. Hoàn tất xử lý → `DELIVERED` (trong 3 ngày làm việc)
4. Khi từ chối `REJECTED` + Tự động hoàn lại điểm đã trừ

> **Ngăn chặn trừ trùng lặp** — Khi một đăng ký đang xử lý, có thể đăng ký trùng lặp cùng số tiền nhưng tất cả đều bị trừ khỏi số dư.

---

# 14. Cài đặt PWA di động

Cổng thông tin hoạt động dưới dạng PWA (Progressive Web App) nên có thể cài đặt như ứng dụng vào màn hình chính của smartphone.

## 7.1 iOS Safari

1. Truy cập địa chỉ cổng thông tin bằng Safari và đăng nhập hoàn tất.
2. Nhấn nút **Chia sẻ** (□↑) ở giữa dưới cùng.
3. Chọn **"Thêm vào màn hình chính"**.
4. Kiểm tra tên và nhấn **Thêm** thì biểu tượng sẽ được tạo trên màn hình chính.

## 7.2 Android Chrome

1. Truy cập địa chỉ cổng thông tin bằng Chrome và đăng nhập hoàn tất.
2. Chọn **⋮ Menu trên cùng bên phải → "Thêm vào màn hình chính"**.
3. Nhấn **Cài đặt** thì biểu tượng sẽ được tạo trong ngăn kéo ứng dụng · màn hình chính.

## 7.3 Sử dụng như ứng dụng

- Sau khi cài đặt sẽ chạy toàn màn hình mà không có thanh địa chỉ trình duyệt.
- Một số màn hình (chính · tình trạng yêu cầu của tôi, v.v.) hiển thị dữ liệu xem cuối bằng cache ngay cả khi offline. Yêu cầu mới · cập nhật trạng thái thời gian thực cần kết nối Internet.

---

# 15. FAQ

**Q. Tôi quên mật khẩu.**
A. Vui lòng liên hệ người phụ trách Tellustech để yêu cầu đặt lại. Chúng tôi không cung cấp tự đặt lại.

**Q. Có thể xem tình trạng tiến hành yêu cầu AS ở đâu?**
A. Được theo dõi qua 4 giai đoạn (yêu cầu → đang xử lý → hoàn tất → đã xác nhận) trong bảng "Tình trạng yêu cầu của tôi" trên màn hình chính. Thông báo cũng được gửi cùng đến email · KakaoTalk đã đăng ký.

**Q. Tôi không thấy mặt hàng mong muốn trong danh sách vật tư.**
A. Có khả năng cao là ánh xạ tương thích chưa được đăng ký. Vui lòng yêu cầu người phụ trách ánh xạ mặt hàng đó với thiết bị của bạn.

**Q. Có vẻ như giá trị bộ đếm trong xác nhận sử dụng bị sai.**
A. Vui lòng liên hệ người phụ trách **trước khi nhấn nút xác nhận**. Khi xác nhận hoàn tất thì không thể chỉnh sửa.

**Q. Có huy hiệu đình chỉ màu đỏ trên header công ty.**
A. Đó là trạng thái menu yêu cầu mới bị tạm thời vô hiệu hóa do thanh toán nợ phải thu bị chậm. Sẽ được giải tỏa tự động sau khi xác nhận thanh toán. Xác nhận sử dụng · tải xuống chứng chỉ hiệu chuẩn có thể sử dụng bất kể đình chỉ.

**Q. Thông báo gửi đến đâu?**
A. Được gửi đến email / KakaoTalk đã đăng ký. Nếu cần thay đổi kênh nhận, vui lòng liên hệ người phụ trách.

**Q. Tôi muốn xem cùng lúc tiếng Hàn và tiếng Việt.**
A. Khi nhập, chỉ cần chọn một ngôn ngữ gốc và soạn thảo, hệ thống sẽ tự động dịch và lưu các ngôn ngữ còn lại. Ngôn ngữ hiển thị có thể chuyển đổi qua biểu tượng cờ ở trên cùng bên phải màn hình.

**Q. Thanh bên đột nhiên biến mất / tôi không tìm thấy menu trên di động.**
A. PC: Nhấn nút ◀ ở trên cùng bên phải thanh bên thì sẽ thu gọn còn 64px. Nhấn ▶ để mở rộng lại. Di động: Nhấn menu hamburger ☰ ở trên cùng bên trái màn hình thì menu sẽ hiện ra từ bên trái.

**Q. Tôi muốn sử dụng ở chế độ ngang (landscape) nhưng tự động xoay không hoạt động.**
A. Nếu được cài đặt dưới dạng PWA, cần một chút thời gian cho đến khi manifest được cập nhật. Hãy xóa biểu tượng trên màn hình chính một lần và sau khi truy cập lại bằng Safari/Chrome rồi "Thêm vào màn hình chính" lại. Nếu truy cập bằng trình duyệt thông thường thì áp dụng ngay khi tải lại trang.

**Q. Tôi muốn vào ERP nội bộ (dành cho nhân viên) sau khi đăng nhập cổng thông tin.**
A. Hãy nhấn nút **🏢 Đăng nhập nhân viên nội bộ** ở dưới cùng thanh bên (hoặc dưới cùng menu hamburger di động). Sẽ tự động đăng xuất và chuyển đến màn hình đăng nhập nội bộ.

**Q. Khi nào điểm được tích lũy?**
A. AS · vật tư · xác nhận dịch vụ · xác nhận sử dụng → ngay lập tức +1,000d. Yêu cầu báo giá · đăng ý kiến → ngay lập tức +1,000d. Khảo sát → +10,000d ngay khi phản hồi. Giới thiệu → +100,000d khi khách hàng mới thanh toán đầu tiên (không phải thời điểm ký hợp đồng).

**Q. Khi nào có thể sử dụng điểm?**
A. Có thể đổi từ tích lũy 1,000,000d. `/portal/points` hoặc nhấn 🏆 trên thanh bên → [Đổi điểm]. Chọn giữa trừ vào tiền hóa đơn hoặc nhận phiếu quà tặng. Xử lý trong 3 ngày làm việc sau khi đăng ký.

**Q. Sau khi yêu cầu báo giá, mất mấy ngày để có câu trả lời?**
A. Người phụ trách kinh doanh Tellustech sẽ được phân công tự động và thường có câu trả lời trong 1~2 ngày làm việc. Khi khẩn cấp, khuyến nghị gọi điện trực tiếp cho người phụ trách.

**Q. Đối tác tôi đã giới thiệu đã ký hợp đồng nhưng điểm chưa vào.**
A. Tích lũy 100,000d được xử lý tại **thời điểm phát sinh thanh toán đầu tiên**. Chỉ ký hợp đồng thì không tích lũy. Nếu đã xác nhận thanh toán mà vẫn bị thiếu, vui lòng liên hệ người phụ trách.

**Q. Có URL nguồn trong bài đăng nhưng không thể nhấp.**
A. Cổng thông tin tự động chuyển đổi thành liên kết có thể nhấp. Nếu hiển thị dưới dạng văn bản thuần, vui lòng tải lại trang.

**Q. Tôi nhấn vào menu chức năng yêu cầu báo giá / đăng ý kiến nhưng hiện trang "Đang chuẩn bị".**
A. Một số chức năng đang được kích hoạt từng bước. Sẽ sớm sử dụng được nên vui lòng đợi một chút.

---

## Liên hệ (Contact)

Đối với những thắc mắc không được đề cập trong sổ tay này hoặc AS khẩn cấp, vui lòng liên hệ theo địa chỉ dưới đây.

- **Tellustech Vietnam** — Điện thoại / Email (tham khảo danh thiếp người phụ trách)
- **Vietrental** — Điện thoại / Email (tham khảo danh thiếp người phụ trách)
- **Đường dây nóng AS khẩn cấp** — (tham khảo danh thiếp người phụ trách)

> Vui lòng tham khảo danh thiếp người phụ trách hoặc trang đầu hợp đồng để có thông tin liên hệ chính xác. Nếu tài liệu được chuyển qua đường nghi vấn, bắt buộc phải xác nhận trực tiếp với người phụ trách trước khi sử dụng.

---

# 16. Hướng dẫn tải xuống / tải lên (KH)

Phần này tổng hợp các tệp · tài liệu mà **người dùng có thể trực tiếp tải xuống hoặc tải lên trên cổng thông tin khách hàng**. Tải lên hàng loạt của ERP nội bộ là riêng biệt (tham khảo sổ tay quản trị viên).

## 16.1 Tải xuống PDF Phiếu xác nhận sử dụng

📍 **Đường dẫn**: Menu "Phiếu xác nhận sử dụng của tôi" → Nút "📄 PDF" của dòng.

⚠️ Chỉ có thể tải xuống sau khi quản trị viên tạo PDF. Ở trạng thái "⬜ Đã thu thập" thì chưa được tạo — sau khi xác nhận của bạn ở "🟡 Đã thông báo" thì PDF sẽ được tạo trong vài ngày.

⚠️ PDF sẽ nhúng **chữ ký của bạn + bộ đếm B/W/Màu + số tiền hóa đơn**. Cẩn thận tránh thất lạc.

💡 **Mẹo**: Lưu PDF hàng tháng vào thư mục kế toán công ty sẽ tiện lợi cho việc đối chiếu nợ phải thu · quyết toán cuối năm.

## 16.2 Tải xuống chứng chỉ báo giá · hiệu chuẩn

📍 **Đường dẫn**: "Báo giá của tôi" hoặc "Thiết bị thuê" → Nhấn vào tệp đính kèm của dòng.

⚠️ Chỉ hiển thị các PDF do quản trị viên đăng ký. Hiển thị ngay sau khi tải lên trường `certPdf` của dòng doanh thu.

💡 **Mẹo**: Chứng chỉ hiệu chuẩn để nộp cho cơ quan chính phủ Việt Nam có thể in PDF nguyên bản để sử dụng (bao gồm chữ ký điện tử).

## 16.3 Tải lên ảnh / tệp AS

📍 **Đường dẫn**: "Yêu cầu AS" → Form đăng ký mới → Vùng đính kèm ảnh.

⚠️ **Khuyến nghị camera di động**. Chụp trực tiếp từ điện thoại sẽ tự động hiệu chỉnh xoay · nén. Nếu tải lên từ PC qua thư mục khác, độ xoay có thể bị lệch.

⚠️ **Định dạng**: JPEG / PNG / PDF. Định dạng iPhone HEIC không được hỗ trợ — chọn "Định dạng tương thích nhất" trong cài đặt camera điện thoại.

⚠️ **Kích thước**: Khuyến nghị tệp đơn lẻ dưới 10MB. Lớn hơn không được tự động nén nên giảm trên điện thoại trước khi đính kèm.

💡 **Mẹo**:
- Chỉ cần 2~3 ảnh nhãn sản phẩm (S/N) + bộ phận hỏng là đủ. Kỹ thuật viên có thể chuẩn bị trước linh kiện trước khi xuất phát → tỷ lệ giải quyết trong 1 lần xuất phát ↑.
- Tệp video không được hỗ trợ. Lỗi vận hành nên dùng ảnh + mô tả văn bản.

## 16.4 Yêu cầu vật tư — Không có đính kèm

📍 "Hợp đồng IT của tôi" → Menu "Yêu cầu vật tư".

Yêu cầu vật tư chỉ nhập văn bản. Không cần đính kèm ảnh · tệp. Chỉ cần chọn từ danh sách vật tư tương thích.

💡 **Mẹo**: Có thể chỉ hiển thị vật tư phù hợp với thiết bị của bạn bằng select "Lọc theo từng thiết bị". Đặc biệt tiện lợi khi sở hữu nhiều model.

## 16.5 Chụp menu / màn hình (người dùng tự thực hiện)

Tải xuống mà ERP cung cấp chỉ có 3 loại trên (PDF · chứng chỉ · ảnh AS reverse). Để sao lưu các màn hình khác (lịch sử điểm · tình trạng cho thuê, v.v.):

💡 **Mẹo**: Sau khi cài đặt PWA, sử dụng "Chụp màn hình" trên di động hoặc chức năng in của trình duyệt PC → Lưu PDF. Thanh bên · header tự động ẩn (chế độ in PWA).

## 16.6 Hướng dẫn bảo mật

⚠️ **PDF · tệp ảnh chỉ có thể tải xuống dữ liệu của khách hàng của bạn**. Khi truy cập dữ liệu khách hàng khác, bị từ chối 401/403.

⚠️ **Sau khi thay đổi mật khẩu cổng thông tin** liên kết tải xuống PDF vẫn hợp lệ (xác thực dựa trên URL X — dựa trên cookie phiên).

⚠️ **Khi chia sẻ ảnh ra bên ngoài**, S/N · mã tài sản có thể hiển thị. Chú ý lộ thông tin tài sản công ty.

💡 **Mẹo**: Khi nghi ngờ thất lạc, ngay lập tức "Thay đổi mật khẩu" → Tất cả phiên hiện có tự động hết hạn.

---

# 17. Trang chi tiết "Yêu cầu của tôi" (NEW)

Khi nhấn vào cột **Số ticket** hoặc **Nội dung** của bảng "Yêu cầu của tôi" sẽ chuyển đến trang chi tiết.

## 17.1 Thông tin hiển thị

- Header: Loại (🛠 Yêu cầu AS / 📦 Yêu cầu vật tư) + Số ticket
- Tóm tắt: Ngày tiếp nhận / Trạng thái / Kỹ thuật viên phụ trách / Ngày hoàn tất / S/N thiết bị đối tượng
- **Yêu cầu AS**: Toàn văn triệu chứng (symptom) — Ngôn ngữ bạn đã nhập + tự động dịch hiển thị phù hợp với ngôn ngữ màn hình hiện tại
- **Yêu cầu vật tư**: Bảng mặt hàng yêu cầu (Mã hàng · tên · số lượng · ghi chú)

## 17.2 Dòng thời gian tiến hành

```
📥 Tiếp nhận hoàn tất    (2026-04-30 14:23)
🚚 Đang xử lý / Xuất phát #1
   Kỹ thuật viên: Khang
   Khởi hành: 04-30 15:00
   Hoàn tất: 04-30 16:30
   Linh kiện sử dụng: Black Toner D330 ×1
✅ Hoàn tất    (2026-04-30 16:35)
```

- Nếu xuất phát nhiều lần thì hiển thị tuần tự #1, #2, ...
- Nếu vẫn đang xử lý thì hiển thị `⏳ Đang chờ xử lý`.

## 17.3 Danh sách chính — Thêm xem trước nội dung

Cột mới **Nội dung** trong bảng "Yêu cầu của tôi":
- Yêu cầu AS → Xem trước 40 ký tự triệu chứng
- Yêu cầu vật tư → Số lượng mặt hàng + S/N thiết bị đối tượng

Toàn bộ mỗi hàng đều có thể nhấp. Tương tự trên PWA di động.

## 17.4 Bảo mật

- Chỉ có thể truy cập ticket của khách hàng của bạn (`clientId === me.clientAccount.id`).
- Khi nhập trực tiếp URL ticket của khách hàng khác sẽ 404.
