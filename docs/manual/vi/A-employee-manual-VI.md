---
title: "Tellustech ERP — Hướng dẫn sử dụng"
subtitle: "Dành cho nhân viên nội bộ (Nhân viên · Phó phòng · Quản lý)"
author: "Đội IT Tellustech"
date: "2026-04"
lang: vi
---

# Lời mở đầu

> **Vị trí của tài liệu này**
> Tài liệu này hướng dẫn cách sử dụng tất cả các module mà nhân viên nội bộ sử dụng hàng ngày.
> Các chức năng dành riêng cho quản trị viên (quản lý quyền · chốt sổ kế toán · thùng rác · audit log · ánh xạ tương thích · phân tích thống kê chuyên sâu) hãy tham khảo tập riêng **B — Hướng dẫn quản trị viên**.
> Cổng portal mà khách hàng sử dụng có tập riêng **C — Hướng dẫn cổng khách hàng**.

ERP này vận hành hai pháp nhân **Tellustech Vina (TV)** và **Vietrental (VR)** trên một hệ thống duy nhất.
Tất cả các màn hình hỗ trợ 3 ngôn ngữ **한국어 / Tiếng Việt / English** và 2 chủ đề **Dark / Light**.

---

# Phần 1. Bắt đầu

## 1.1 Truy cập ERP và đăng nhập

Truy cập địa chỉ ERP đã được hướng dẫn trên trình duyệt (Chrome / Edge / Safari).

```
https://tellustech-admin-production.up.railway.app
```

> Hãy xác nhận domain chính xác với đội IT. Cổng khách hàng sử dụng domain khác.

Trên màn hình đăng nhập, nhập 4 mục sau.

| Mục | Ví dụ / Lựa chọn |
|---|---|
| **Mã công ty** | `TV` (Tellustech Vina) hoặc `VR` (Vietrental) |
| **ID** | (Đội IT cấp) |
| **Mật khẩu** | (Đội IT cấp) |
| **Ngôn ngữ** | Tiếng Việt / 한국어 / English |

> **Mã công ty được cố định trong toàn phiên làm việc**. Để xem dữ liệu của công ty khác, hãy đăng xuất rồi đăng nhập lại, hoặc nếu có quyền thì chuyển bằng company picker ở sidebar (§1.4).

## 1.2 Việc cần làm sau lần đăng nhập đầu tiên

1. **Đổi mật khẩu** — Mật khẩu tạm do đội IT cấp nên được đổi ngay sang giá trị bạn có thể nhớ.
2. **Kiểm tra thông tin cá nhân** — Trong menu `Nhân viên (👤)`, kiểm tra xem thẻ của bạn đã được đăng ký dưới đúng phòng ban · pháp nhân của mình hay chưa. Nếu thiếu, yêu cầu người phụ trách nhân sự đăng ký.
3. **Chọn ngôn ngữ · chủ đề** — Nhấn vào một trong 3 lá cờ ở đầu sidebar để chọn ngôn ngữ hiển thị, sử dụng nút ☀ / 🌙 dưới sidebar để chọn chủ đề. Cả hai cài đặt đều được lưu theo từng người dùng.

## 1.3 Chuyển ngôn ngữ và Dark mode

- **Ngôn ngữ**: 3 lá cờ SVG tròn ở đầu sidebar (🇻🇳 / 🇺🇸 / 🇰🇷). Ngôn ngữ đang hoạt động được làm nổi bằng viền phát sáng. Khi nhấn, trang sẽ tải lại ngay lập tức và menu · nhãn · thông điệp sẽ thay đổi.
- **Dark / Light mode**: Toggle `☀ Light` / `🌙 Dark` ở dưới sidebar. Mặc định là Dark. Lựa chọn được lưu trong trình duyệt (`localStorage`) và duy trì cho lần truy cập tiếp theo.

> Đối với các trường mô tả tự do (triệu chứng AS · đánh giá · sự cố v.v.), nếu bạn chỉ nhập một ngôn ngữ thì hệ thống sẽ tự động dịch và lưu sang hai ngôn ngữ còn lại (xem §A Phụ lục C).

## 1.4 Bố cục màn hình (Sidebar · Main)

Màn hình gồm 2 cột: **sidebar** bên trái và **vùng main** bên phải.

### Sidebar — từ trên xuống

1. **Logo / Toggle thu gọn** — Logo `TTS` + nút `‹ / ›`. Ở chế độ thu gọn chỉ còn lại icon.
2. **Chọn ngôn ngữ** — 3 lá cờ SVG tròn (VI / EN / KO).
3. **Company picker** — Chỉ hiển thị cho người dùng có `allowedCompanies` từ 2 trở lên. Khi nhấn vào một trong `TV` / `VR` / `ALL` (xem tổng hợp), trang sẽ tải lại và toàn bộ màn hình được lọc theo dữ liệu của công ty đó.
4. **🏠 Trang chủ** — Dashboard.
5. **Nhóm module (10 nhóm)** — Mỗi header nhóm được phân biệt bằng thanh ngang nhỏ màu cam + tên nhóm. Bên trong mỗi nhóm chứa các mục menu của từng module.
   - Master / Bán hàng / Cho thuê / AS / Tồn kho / Nhân sự / Tài chính kế toán / Họp / Lịch / Nhắn tin
   - Nếu có quyền quản trị viên thì có thêm một dòng nhóm **Quản trị viên** (audit log · quyền · ánh xạ tương thích · chốt sổ kế toán · thùng rác · **điểm portal · banner portal · yêu cầu báo giá · ý kiến khách hàng · bài đăng portal · khảo sát · gợi ý nhà cung cấp** · thống kê).
6. **Toggle chủ đề** — ☀ / 🌙 ở dưới cùng.

> **Ẩn theo quyền**: Module có cấp quyền `HIDDEN` sẽ tự động bị ẩn khỏi sidebar. Cùng một màn hình nhưng số lượng menu hiển thị có thể khác nhau giữa các người dùng.

### Vùng Main

- **Phía trên**: Header trang (breadcrumb + tiêu đề), các nút hành động ở góc trên bên phải như `[Mới]` / `[Lưu]`.
- **Nội dung**: Thanh tìm kiếm, bộ lọc, bảng dữ liệu hoặc form nhập liệu.
- **Bảng dữ liệu**: Sắp xếp bằng header cột, lọc trong phạm vi công ty bằng thanh tìm kiếm.

---

# Phần 2. Module Master

Master là module để đăng ký các dữ liệu tham chiếu chung giữa các module. **Master dùng chung** (khách hàng · mặt hàng · kho) không có mã công ty nên cả hai pháp nhân tham chiếu cùng một dữ liệu, các phần còn lại (nhân viên · phòng ban · dự án · lịch · giấy phép) được lưu tách biệt theo từng công ty.

## 2.1 Khách hàng (`/master/clients`)

Đăng ký tất cả công ty mà quý công ty giao dịch. **Master dùng chung** — TV / VR đều xem cùng tập khách hàng.

### Đăng ký — Ảnh hưởng theo từng giá trị nhập

Nút `[Mới]` → nhập các mục sau.

| Trường | **Tác dụng của giá trị này trong hệ thống** |
|---|---|
| **Mã khách hàng** | Tự động sinh `CL-YYMMDD-###` (không sửa được). Là khóa ngoại của mọi module |
| **Tên công ty (VI/EN/KO)** | Khi nhập một ngôn ngữ, tại thời điểm lưu Claude API tự động dịch sang 2 ngôn ngữ còn lại → điền đầy đủ 3 cột `companyNameVi/En/Ko` |
| **Mã số thuế** | `taxCode` (mã số doanh nghiệp Việt Nam). Khóa để phát hành hóa đơn thuế |
| **Địa chỉ · Điện thoại · Email · Người phụ trách** | Nhập tự do. Dùng cho thông báo AS · gợi ý dispatch tự động |
| **Điều kiện thanh toán (paymentTerms)** | Số ngày (vd: 30). Khi đăng ký bán hàng, ngày đáo hạn công nợ phải thu = ngày bán + giá trị này. Bỏ trống thì mặc định 30 ngày |
| **Trạng thái thu tiền** | `NORMAL` / `WARNING` / `BLOCKED` — tự động tính toán (module Tài chính kế toán), chỉ quản trị viên mới chỉnh được thủ công |

### Combobox tìm kiếm · gợi ý tự động

Trên mọi màn hình chọn khách hàng (bán hàng · mua hàng · cho thuê · AS v.v.) đều dùng **combobox tìm kiếm tự động** (khớp một phần `Mã khách hàng` hoặc `Tên công ty`). Khách hàng không xuất hiện trong dropdown có thể được đăng ký ngay trong tab mới qua link `+ Đăng ký khách hàng`.

### Badge trạng thái thu tiền

- 🟢 `NORMAL` — Bình thường.
- 🟡 `WARNING` — Vượt ngưỡng công nợ phải thu — chỉ hiển thị cảnh báo khi giao dịch mới.
- 🔴 `BLOCKED` — Tự động chặn lập bán hàng · tiếp nhận AS mới. Người phụ trách Tài chính kế toán xác nhận thanh toán rồi giải chặn.

## 2.2 Mặt hàng (`/master/items`)

Đăng ký tất cả mặt hàng được bán · cho thuê · tiêu hao. **Master dùng chung**.

### Loại mặt hàng

| Mã | Ý nghĩa | Công dụng |
|---|---|---|
| `PRODUCT` | Sản phẩm chính · thành phẩm | Đối tượng bán hàng · cho thuê (vd: máy in, thiết bị đo) |
| `CONSUMABLE` | Vật tư tiêu hao | Các mặt hàng xuất kho định kỳ (vd: mực, mực in) |
| `PART` | Linh kiện | Dùng để thay thế khi AS · hiệu chuẩn (vd: cụm drum) |

### Đăng ký — Ảnh hưởng theo từng giá trị nhập

| Trường | **Tác dụng của giá trị này trong hệ thống** |
|---|---|
| **Mã mặt hàng** | Tự động sinh `ITM-YYMMDD-###` (không sửa được). Là khóa ngoại cho mọi dòng tồn kho · bán hàng · mua hàng |
| **Tên mặt hàng (chỉ tiếng Anh)** | `Item.name`. **Chỉ cho phép tiếng Anh** (tương thích với hệ thống tem nhãn · QR Việt Nam). Khi nhập không phải tiếng Anh sẽ bị từ chối với `english_only` |
| **Đơn vị (unit)** | `EA`, `BOX`, `LIT` v.v. nhập tự do |
| **Danh mục (category)** | Nhập tự do để phân loại. Dùng làm khóa tìm kiếm |
| **Loại (itemType)** | `PRODUCT` / `CONSUMABLE` / `PART` — Tiêu chí cho ánh xạ tương thích · sắp xếp linh kiện dispatch tự động · phân tách thống kê |

### Ánh xạ tương thích

Quan hệ tương thích giữa `PRODUCT` và `CONSUMABLE` / `PART` được đăng ký ở màn hình riêng (`/admin/item-compatibility`). Ánh xạ này được dùng làm bộ lọc tự động ở **màn hình yêu cầu vật tư tiêu hao của cổng khách hàng**. Ánh xạ chỉ dành cho quản trị viên — xem Phần 6, Tập B.

## 2.3 Kho (`/master/warehouses`)

Đăng ký vị trí lưu trữ tồn kho. **Master dùng chung**.

| Trường | Ghi chú |
|---|---|
| **Mã kho** | Nhập tự do (vd: `WH-HCM-01`) |
| **Tên kho** | Nhập tự do |
| **Loại** | `INTERNAL` (nội bộ) hoặc `EXTERNAL` (khách hàng · lưu trữ bên ngoài) |

> Kho `EXTERNAL` được hiển thị kèm với **lựa chọn khách hàng** ở màn hình nhập xuất kho. Dùng để theo dõi thiết bị đang cho thuê · kiểm tra bên ngoài.

## 2.4 Nhân viên (`/master/employees`)

Master nhân sự được tách theo pháp nhân.

### Đăng ký — Ảnh hưởng theo từng giá trị nhập

| Trường | **Tác dụng của giá trị này trong hệ thống** |
|---|---|
| **Công ty** | `Employee.companyCode` (TV/VR). Quyết định prefix mã nhân viên + lọc tùy chọn phòng ban |
| **Phòng ban** | `departmentId`. Chỉ hiển thị các phòng ban thuộc công ty đã chọn (tự động reset khi đổi công ty) |
| **Mã nhân viên** | Tự động sinh — `TNV-###` (TV) / `VNV-###` (VR). **Số thứ tự theo công ty, không có YYMMDD** — dùng chung một bộ đếm cả năm |
| **Tên (VI/EN/KO)** | Khi nhập một ngôn ngữ sẽ tự động dịch sang 3 ngôn ngữ (vì tên là phiên âm nên có thể không tự nhiên, khuyến nghị nhập trực tiếp) |
| **Chức vụ · Email · Điện thoại · Ngày vào làm** | Thông tin cơ bản. Hiển thị thống kê · liên lạc |
| **Số CMND · Ảnh** | `idCardNumber/idCardPhotoUrl`. Tuân thủ nhân sự |
| **Lương · Số bảo hiểm** | `salary/insuranceNumber`. Module lương trực tiếp tham chiếu (đối tượng ẩn theo quyền) |
| **Thông tin hợp đồng** | `contractType/contractStart/contractEnd`. Thông báo khi sắp hết hạn |
| **Trạng thái (status)** | ACTIVE / ON_LEAVE / TERMINATED — Tiêu chí cho bộ lọc nhân viên đang hoạt động |

### Những việc xảy ra khi lưu

1. **Cấp mã nhân viên** — Bộ đếm theo công ty +1 → kiểu `TNV-001` / `VNV-001`.
2. **Dịch tên 3 ngôn ngữ** (khi chỉ nhập một ô tên).
3. **Kiểm tra hợp lệ** — Khớp công ty · phòng ban (từ chối nếu chọn phòng ban của công ty khác).

> **Xóa**: Không thể xóa nhân viên đang được tham chiếu bởi module khác (`employee_has_dependent_rows`). Hãy đổi trạng thái sang `TERMINATED`.

## 2.5 Phòng ban (`/master/departments`)

Đăng ký phòng ban · chi nhánh theo từng công ty.

| Trường | Ghi chú |
|---|---|
| **Mã phòng ban** | Nhập tự do (vd: `DEPT-SALES`) |
| **Tên phòng ban (VI/EN/KO)** | Áp dụng dịch tự động |
| **Công ty** | TV hoặc VR |

Để xóa một phòng ban, trước hết số nhân viên thuộc phòng đó phải là 0.

## 2.6 Dự án (`/master/projects`)

Đăng ký đơn vị dự án để gom các giao dịch bán hàng · mua hàng. Tách biệt theo công ty.

| Trường | Ghi chú |
|---|---|
| **Mã dự án** | Nhập tự do |
| **Tên dự án** | Nhập tự do |
| **Loại (salesType)** | `TRADE` (giao thương), `MAINTENANCE` (bảo trì), `RENTAL` (cho thuê), `CALIBRATION` (hiệu chuẩn), `REPAIR` (sửa chữa), `OTHER` |

> Khi lập bán hàng, dòng bán của dự án có loại `CALIBRATION` sẽ được tự động nhận diện là **đối tượng phát hành chứng chỉ hiệu chuẩn** — có thể tải xuống ở cổng khách hàng.

## 2.7 Lịch (`/master/schedules`) · Calendar (`/calendar`)

Đăng ký lịch công ty · cá nhân và hiển thị trên calendar.

### Đăng ký lịch

| Trường | Ghi chú |
|---|---|
| **Mã lịch** | Tự động sinh `SCH-YYMMDD-###` |
| **Tiêu đề (title)** | Bắt buộc |
| **Hạn (dueAt)** | Bắt buộc |
| **Người phụ trách** | Chọn từ nhân viên đang hoạt động |
| **Lặp lại** | Mẫu ngày/tuần/tháng (tùy chọn) |

### Calendar

Chuyển đổi xem theo tháng · tuần · ngày. Nhấn vào thẻ lịch để xem chi tiết. Có thể liên kết với các module bên ngoài như biên bản họp · hợp đồng theo trạng thái CFM (xác nhận).

## 2.8 Giấy phép (`/master/licenses`)

Quản lý hết hạn của phần mềm · chứng chỉ · giấy chứng nhận.

| Trường | Bắt buộc |
|---|---|
| **Tên (name)** | ✓ |
| **Ngày cấp (acquiredAt)** | ✓ |
| **Ngày hết hạn (expiresAt)** | ✓ |
| **Đối tượng cấp** | Nhân viên hoặc tài sản (SN) |
| **Ghi chú** | Tự do |

Các mục sắp hết hạn sẽ được hiển thị trong thông báo dashboard.

> **Ánh xạ tương thích** (`/admin/item-compatibility`) chỉ dành cho quản trị viên. Xem **Tập B — Phần 6**.

---

# Phần 3. Bán hàng (Bán / Mua)

Bán hàng và mua hàng được xây dựng theo cùng một cấu trúc. Khác biệt chỉ ở **đối tác giao dịch (khách hàng / nhà cung cấp)** và **chiều luân chuyển tồn kho (xuất / nhập)**.

## 3.1 Bán hàng (`/sales`)

### Quy trình đăng ký mới

Nút `[+ Mới]` → vào `/sales/new`.

### Ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | Nguồn/Định dạng | **Tác dụng của giá trị này trong hệ thống** |
|---|---|---|
| **Khách hàng** | ClientCombobox | Lưu `Sales.clientId` → Tự động tính ngày đáo hạn công nợ phải thu theo điều kiện thanh toán (`paymentTerms`). Khách hàng `BLOCKED` bị từ chối với `client_blocked` (cần quản trị viên ép duyệt) |
| **Dự án** | Select (phạm vi công ty) | Lưu `Sales.projectId`. Phân nhánh form + phân nhánh xử lý dòng theo `salesType` của dự án đó |
| **Người phụ trách bán hàng** | Select nhân viên (tùy chọn) | Lưu `Sales.salesEmployeeId`. Tổng hợp ở màn hình thống kê 「Thành tích người phụ trách bán hàng」 |
| **Kỳ sử dụng (header)** | 2 ô date (bắt buộc khi `MAINTENANCE`/`RENTAL`) | Lưu `Sales.usagePeriodStart/End` + nếu các dòng để trống thì tự động sao chép sang kỳ của dòng |
| **Kho** | Select (bắt buộc khi `TRADE`) | Lưu `Sales.warehouseId`. **Chỉ khi TRADE** mới tự động sinh giao dịch tồn kho OUT cho mỗi dòng |
| **Loại tiền** | VND/USD/KRW/JPY/CNY | Lưu `Sales.currency`. Bắt buộc nhập tỷ giá khi không phải VND |
| **Tỷ giá** | Số (VND tự động 1.0) | Lưu `Sales.fxRate`. Dùng để quy đổi sang VND khi tổng hợp thống kê · công nợ phải thu |
| **Mặt hàng (dòng)** | ItemCombobox | `SalesItem.itemId`. 1 dòng = 1 mặt hàng |
| **S/N (dòng)** | SerialCombobox | `SalesItem.serialNumber`. **Khi TRADE thực hiện 3 kiểm tra**: ① Nếu giao dịch cuối cùng là OUT thì từ chối với `serial_already_sold` ② Nếu SN đã được đăng ký trong hợp đồng IT/TM đang hoạt động thì từ chối với `serial_in_active_contract` ③ Phải qua cả hai mới sinh giao dịch OUT |
| **Số lượng (dòng)** | Số dương | `SalesItem.quantity`. Tổng dòng = số lượng × đơn giá |
| **Đơn giá (dòng)** | Từ 0 trở lên | `SalesItem.unitPrice` |
| **Ngày bắt đầu/kết thúc (dòng)** | date (khi `MAINTENANCE`/`RENTAL`) | `SalesItem.startDate/endDate`. Nếu trống sẽ tự động sao chép kỳ của header |
| **Ghi chú** | Văn bản tự do | `Sales.note` |

### Phân nhánh `salesType` trong nháy mắt

| salesType | Kỳ sử dụng | Kho | Mục bổ sung | Ghi chú |
|---|:-:|:-:|---|---|
| `TRADE` (giao thương) | – | ✓ | – | Bán hàng thông thường — xử lý xuất kho |
| `MAINTENANCE` (bảo trì) | ✓ | – | – | Nhập kỳ, không trừ tồn kho |
| `RENTAL` (cho thuê) | ✓ | – | – | Thường được quản lý riêng ở module TM/IT |
| `CALIBRATION` (hiệu chuẩn) | – | – | Số chứng chỉ · Ngày cấp · PDF | Dòng là **đối tượng tải xuống ở cổng khách hàng** |
| `REPAIR` (sửa chữa) | – | – | – | Doanh thu sửa chữa đơn lẻ tách biệt với AS |
| `OTHER` | – | – | – | Doanh thu không thuộc các phân loại trên |

### Số tự động và điều kiện thanh toán

Khi lưu, số bán hàng sẽ được cấp tự động theo định dạng `SLS-YYMMDD-###`. Điều kiện thanh toán của khách hàng master (vd: 30 ngày) được hiển thị ở phần hướng dẫn header và là cơ sở tính công nợ phải thu/đáo hạn.

### Hiển thị tổng

Tổng dòng được hiển thị tích lũy theo từng loại tiền ở góc dưới bên phải màn hình. Khi là loại tiền không phải VND, **giá trị quy đổi VND** được nhân với tỷ giá cũng được hiển thị cùng.

### Danh sách bán hàng — Cột tỷ lệ phù hợp (NEW)

Cột cuối cùng của danh sách bán hàng `/sales` hiển thị **badge tỷ lệ phù hợp**.

- Định dạng hiển thị: `B/W 🟢 90%  C 🟢 90%` (B/W = đen trắng, C = màu)
- **Chỉ hiển thị cho bán hàng dự án RENTAL** — TRADE/MAINTENANCE/CALIBRATION v.v. là "—"
- Lấy giá trị **đáng lo nhất** (tỷ lệ phù hợp thấp nhất) trong số các thiết bị hợp đồng IT của cùng khách hàng
- Khi nhấn sẽ chuyển sang `/admin/yield-analysis` để xem chi tiết
- Việc thấy hai badge **không phải lỗi** mà là hiển thị đồng thời hai tỷ lệ phù hợp đen trắng · màu

### Những việc xảy ra trong một transaction khi lưu

Khi nhấn nút 「Đăng ký bán hàng」 → các bước sau được thực thi trong cùng một DB transaction (nếu thất bại sẽ rollback toàn bộ).

1. **Cấp số bán hàng** — `SLS-YYMMDD-###` (số thứ tự của ngày + 1).
2. **Tạo dòng `Sales`** — Thông tin header + `totalAmount` (tổng dòng).
3. **Tạo dòng `SalesItem`** — INSERT hàng loạt theo số dòng.
4. **Tự động tạo IN tồn kho OUT** (chỉ khi TRADE + có warehouseId) — Tự động INSERT `InventoryTransaction(txnType=OUT, fromWarehouseId=kho đã chọn, reason=SALE)` cho mỗi dòng.
5. **Tự động tạo công nợ phải thu** — `PayableReceivable(kind=RECEIVABLE, status=OPEN, amount=totalAmount, dueDate=hôm nay+paymentTerms)`. Nếu khách hàng không có điều kiện thanh toán thì mặc định 30 ngày.
6. **Tính lại receivableStatus của khách hàng** — Khi công nợ tích lũy vượt ngưỡng sẽ tự động chuyển sang `WARNING` / `BLOCKED`.
7. **Audit log từ 4 bản ghi trở lên** — Ghi nhận toàn bộ INSERT của Sales · SalesItem(N) · InventoryTransaction(N) · PayableReceivable.

## 3.2 Mua hàng (`/purchases`)

Có cấu trúc form giống bán hàng, chỉ khác **nhãn từ khách hàng → nhà cung cấp**.

### Ảnh hưởng dữ liệu theo từng giá trị nhập — Khác biệt với bán hàng

| Đầu vào | **Tác dụng của giá trị này trong hệ thống** |
|---|---|
| **Nhà cung cấp** | `Purchase.supplierId` (thay vì `clientId` của bán hàng) → Tính **ngày đáo hạn công nợ phải trả** theo điều kiện thanh toán |
| **Kho (khi TRADE)** | Tự động sinh giao dịch tồn kho **IN** cho từng dòng (bán hàng là OUT) |
| **Phần còn lại** | Giống bán hàng — dự án · kỳ · loại tiền · tỷ giá · dòng mặt hàng · ghi chú |

- Số tự động: `PUR-YYMMDD-###`
- Quy tắc phân nhánh kỳ sử dụng · kho giống bán hàng.

### Những việc xảy ra khi lưu — Khác biệt với bán hàng

| Bước | Bán hàng | Mua hàng |
|---|---|---|
| **Giao dịch tồn kho** | OUT (xuất, reason=SALE) | IN (nhập, reason=PURCHASE) |
| **Tự động tạo PR** | `RECEIVABLE` (công nợ phải thu) | `PAYABLE` (công nợ phải trả) |
| **Trạng thái khách hàng được tính lại** | `Client.receivableStatus` | (không áp dụng cho nhà cung cấp) |

> Mua hàng có kỳ sử dụng (`MAINTENANCE` / `RENTAL`) được dùng làm đối tượng **phân bổ chi phí tự động (allocations)** — Phân bổ chi phí theo tháng tương ứng với kỳ của dòng.

## 3.3 Combobox tìm kiếm tự động — Khách hàng / Mặt hàng / S/N

Các trường khách hàng · mặt hàng · S/N trên mọi màn hình nhập liệu (bao gồm bán hàng · mua hàng) đều là **combobox gợi ý tự động tìm kiếm trên server**.

| Combobox | Khóa tìm kiếm | API |
|---|---|---|
| **Khách hàng** | Khớp một phần `Mã khách hàng` hoặc `Tên công ty` | `/api/master/clients?q=` |
| **Mặt hàng** | Khớp một phần `Mã mặt hàng` hoặc `Tên mặt hàng` | `/api/master/items?q=` |
| **S/N** | Khớp một phần `serialNumber` (tự động trong phạm vi công ty) | `/api/inventory/sn/search?q=` |

### Mẹo sử dụng

- Yêu cầu được gửi đến server sau 220ms khi nhập — phản hồi tức thì ngay cả với dữ liệu hàng nghìn bản ghi.
- Combobox S/N cũng cho phép nhập tự do. Có thể nhập trực tiếp các SN không có trong tồn kho (thiết bị bên ngoài · vật tư khách hàng cấp) để sử dụng.
- Nếu không thấy mục mong muốn trong kết quả dropdown, có thể đăng ký ở tab mới rồi tìm lại (sử dụng link `+ Đăng ký` ở dưới combobox khách hàng · mặt hàng).

## 3.4 Chỉnh sửa · Hoàn tiền (Adjustments)

Sau khi đã đăng ký bán hàng · mua hàng, khi cần **trả hàng · đổi hàng · điều chỉnh đơn giá**, hãy sử dụng tab **Chỉnh sửa / Adjustments** trên màn hình chi tiết.

| Loại | Ý nghĩa | Ảnh hưởng tồn kho |
|---|---|---|
| `RETURN` | Trả hàng | Xử lý nhập kho theo đơn vị S/N của dòng |
| `EXCHANGE` | Đổi hàng | Thu hồi một dòng và xuất SN khác |
| `PRICE_ADJUST` | Điều chỉnh đơn giá | Không ảnh hưởng tồn kho, chỉ thay đổi số tiền quyết toán |

> **Chính sách**: 1 dòng items = 1 S/N = số lượng 1. Để xử lý nhiều SN cùng lúc, hãy thêm các dòng.

Mỗi điều chỉnh được tự động cấp `adjustCode` và chịu ảnh hưởng của chính sách chốt sổ kế toán (khóa) — điều chỉnh của bán hàng thuộc tháng đã khóa sẽ bị chặn (Tập B Phần 3).

---

# Phần 4. Cho thuê (Rental)

Module cho thuê trong ERP được chia thành hai module riêng biệt.

| Module | Đối tượng | Số tự động | Đơn vị tính phí |
|---|---|---|---|
| **Hợp đồng IT** (`/rental/it-contracts`) | Thiết bị IT như máy in, máy in đa năng | `TLS-YYMMDD-###` (TV) / `VRT-YYMMDD-###` (VR) | Phí cố định hàng tháng + sử dụng theo bộ đếm |
| **TM Rental** (`/rental/tm-rentals`) | Thiết bị đo lường, cho thuê đơn lẻ/ngắn hạn | `TM-YYMMDD-###` | Đơn giá theo ngày/tháng |

## 4.1 Hợp đồng IT (`/rental/it-contracts`)

### Đăng ký hợp đồng mới

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Khách hàng** (ClientCombobox, bắt buộc) | `ItContract.clientId`. Lưu sau khi xác minh tồn tại. Việc phân tách theo công ty được quyết định không phải bởi khách hàng mà bởi **mã công ty của session** |
| **Địa chỉ lắp đặt** | `ItContract.installationAddress` (tự do). Dùng cho gợi ý tự động điểm xuất phát điều phối |
| **Ngày bắt đầu/kết thúc** | `startDate/endDate` cả hai đều bắt buộc. Nếu `endDate < startDate` thì từ chối |
| **Tiền đặt cọc·phí lắp đặt·phí vận chuyển·phí dịch vụ bổ sung** | 4 cột `deposit/installationFee/deliveryFee/additionalServiceFee`. Hiển thị thành dòng riêng biệt trong màn hình tính phí |
| **Tiền tệ** | VND/USD/KRW/JPY/CNY → `currency` |
| **Tỷ giá** | `fxRate` (6 chữ số thập phân). Là cơ sở quy đổi khi không phải VND |
| **3 loại phụ trách: hợp đồng/kỹ thuật/tài chính** | 12 cột tên·điện thoại·số máy lẻ·email. Liên hệ phía khách hàng. Dùng cho thông báo AS tự động |

### Những gì xảy ra khi lưu

1. **Quyết định prefix công ty** — `companyCode` của session là TV → `TLS-`, VR → `VRT-`.
2. **Cấp số hợp đồng** — `TLS-YYMMDD-###` hoặc `VRT-YYMMDD-###`.
3. **Tạo dòng `ItContract`** — Trạng thái `DRAFT` (việc thêm thiết bị an toàn ở giai đoạn DRAFT — có thể thêm/xóa tự do).
4. **Chuyển sang trang chi tiết** — Tab đăng ký thiết bị·tính phí được hiển thị.

### Chính sách phân tách công ty (khi tra cứu)

- Người dùng thông thường: chỉ thấy prefix công ty của session bản thân (`TLS-` hoặc `VRT-`).
- ADMIN/MANAGER: Thấy cả hai công ty. Có thể lọc rõ ràng bằng tham số `?company=TV|VR`.

### Đăng ký thiết bị (tiền đề DRAFT → ACTIVE)

Đăng ký bằng nút `[+ Thêm thiết bị]` trên trang chi tiết — mức độ ảnh hưởng theo từng giá trị nhập:

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **S/N** (SerialCombobox, bắt buộc) | `ItContractEquipment.serialNumber`. **Chính sách STRICT**: chỉ cho phép SN có trong tồn kho công ty (`InventoryItem`) → chặn đăng ký thiết bị bên ngoài vào hợp đồng IT |
| **Mặt hàng** (ItemCombobox, bắt buộc) | `itemId`. Là khóa của ánh xạ tương thích (`ItemCompatibility`) — vật tư tiêu hao tương thích phải được ánh xạ với mặt hàng đã đăng ký thì khách hàng mới yêu cầu vật tư qua portal được |
| **Phí cố định hàng tháng (monthlyBaseFee)** | Phí cơ bản hàng tháng trong màn hình tính phí. Có thể khác nhau tùy SN |
| **Bộ đếm (đen trắng/màu)** | Bộ đếm bắt đầu (thường là 0 hoặc giá trị đo). Dùng để tính lượng sử dụng theo chênh lệch ở lần tính phí kế tiếp |
| **Ngày lắp đặt (installedAt)** | Tự động = thời điểm đăng ký. Có thể thay đổi |

### Những gì xảy ra khi đăng ký thiết bị

1. **Tạo dòng `ItContractEquipment`** — `removedAt = null` (đang hoạt động).
2. **Tự động tạo giao dịch OUT tồn kho** — SN đó được trừ khỏi tồn kho (`reason=RENTAL`).
3. **Khớp tự động trong tìm kiếm SN** — Phản ánh ngay vào tính năng tự phát hiện hợp đồng đang hoạt động trong màn hình nhập/xuất kho.
4. **Cập nhật「Hợp đồng IT của tôi」trong portal khách hàng** — Số lượng thiết bị tăng +1 ngay lập tức.

### Bảng thiết bị — Thẻ tỷ lệ phù hợp (NEW)

Các cột sau được thêm vào bảng danh sách thiết bị.

| Cột | Mô tả |
|---|---|
| **Mật độ phủ thực tế (%)** | Nhập inline (1~100). Mặc định 5. Khách hàng in nhiều ảnh/đồ họa điều chỉnh thành 10~15% v.v. Khi thay đổi sẽ lưu ngay (PATCH) |
| **Tỷ lệ phù hợp** | Kết quả tính lần cuối — Định dạng `B/W 🟢 90% · C 🟢 90%`. Khi chưa tính sẽ hiện hướng dẫn "Tính lại" |
| Hành động | 📊 (Tính lại 6 tháng cho 1 thiết bị) / Sửa / Xóa |

Nút 📊 sẽ gọi ngay `/api/yield-analysis/calculate` để tính lại 6 tháng cho 1 thiết bị duy nhất và phản ánh kết quả vào ô. Vì cron tự động sẽ tính hàng loạt vào 02:00 KST ngày 1 mỗi tháng nên trong vận hành bình thường, hầu như không cần tính lại thủ công.

> Mô tả tổng thể về hệ thống tỷ lệ phù hợp xem tại **Phần 13 sách hướng dẫn B**.

### Luồng trạng thái

```
DRAFT → ACTIVE → COMPLETED / CANCELED
```

- `DRAFT` — Tự do thêm/xóa thiết bị.
- `ACTIVE` — Việc thay đổi thiết bị chỉ có thể qua **Amendments** (lưu lịch sử).
- `COMPLETED` — Kết thúc hợp đồng. Thu hồi toàn bộ thiết bị.
- `CANCELED` — Hủy giữa chừng.

### Tính phí hàng tháng — Mức độ ảnh hưởng theo từng giá trị nhập

Trong tab **Tính phí / Billing** của trang chi tiết, nhấn `[+ Thêm tính phí]`:

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **SN thiết bị** (Select — chỉ các SN đã đăng ký của hợp đồng đó) | `ItMonthlyBilling.serialNumber` (khớp với dòng thiết bị) |
| **Tháng tính phí** (`YYYY-MM`) | `billingMonth`. Chặn đăng ký trùng lặp cùng SN+tháng |
| **Bộ đếm đen trắng/màu** | `counterBw/counterColor`. Tính lượng sử dụng theo chênh lệch với bộ đếm tháng trước |
| **Phương thức tính phí (billingMethod)** | `COUNTER` (theo lượng sử dụng) / `FIXED` (phí cố định hàng tháng) — Phân nhánh công thức tính |

### Những gì xảy ra khi đăng ký tính phí

1. **Tạo dòng `ItMonthlyBilling`** — Tự động tính lượng sử dụng → Điền vào `computedAmount`.
2. **Hiển thị ngay màn hình「Xác nhận sử dụng」trong portal khách hàng** — Nếu là khách hàng của bản thân thì sẽ thấy dòng đó.
3. **Trạng thái chờ chữ ký khách hàng** — `customerSignature = null`. Sau khi xác nhận sẽ tự tạo công nợ phải thu (xem sách C 5.5).

## 4.2 TM Rental (`/rental/tm-rentals`)

### Đăng ký mới — Mức độ ảnh hưởng theo từng giá trị nhập

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Khách hàng** (ClientCombobox, bắt buộc) | `TmRental.clientId` |
| **Thời hạn cho thuê (header)** | `startDate/endDate`. Nếu thời hạn dòng để trống thì tự động sao chép |
| **Dòng thiết bị - S/N** (SerialCombobox) | `TmRentalItem.serialNumber`. **Chính sách LOOSE** — Có thể đăng ký dù không có trong tồn kho công ty (cho phép thiết bị thuê ngoài, chỉ cảnh báo) |
| **Dòng thiết bị - Mặt hàng** | `TmRentalItem.itemId` |
| **Dòng thiết bị - Đơn giá ngày/tháng** | `TmRentalItem.salesPrice`. Là cơ sở tính phí |
| **Dòng thiết bị - Ngày bắt đầu/kết thúc** | Thời hạn cấp dòng. Phải nằm trong thời hạn header |
| **Tiền tệ/Tỷ giá** | `currency/fxRate`. Giống như doanh thu |

Số tự động `TM-YYMMDD-###` được cấp.

### Những gì xảy ra khi lưu

1. **Tạo cùng lúc `TmRental` + `TmRentalItem`** — Một transaction.
2. **Tự động OUT tồn kho** — Chỉ trong trường hợp là SN tồn kho công ty (LOOSE — SN bên ngoài không tạo transaction, chỉ theo dõi).
3. **Hiển thị trên thẻ「Hợp đồng IT của tôi」portal khách hàng** (TM cũng được hiển thị cùng).
4. **Phản ánh ngay vào tìm kiếm SN đang hoạt động** — Bao gồm trong tính năng tự phát hiện onBlur của màn hình nhập/xuất kho.

### Tính phí

Tính theo từng dòng (ngày kết thúc − ngày bắt đầu) × đơn giá. Nếu phát sinh thu hồi một phần trong thời hạn header, dùng **Amendments** để rút ngắn ngày kết thúc của dòng (mục kế tiếp).

## 4.3 Đăng ký / Thay thế / Thu hồi thiết bị — Amendments

Dùng khi thay đổi thiết bị của hợp đồng·rental ở trạng thái `ACTIVE`. Có hai đường: **nhập thủ công** và **kích hoạt tự động qua nhập/xuất kho**.

### Amendment thủ công — Mức độ ảnh hưởng theo từng giá trị nhập

Trong tab **Sửa/Lịch sử / Amendments** của trang chi tiết → `[+ Amendment mới]`:

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Loại (type)** | `ADD_EQUIPMENT` / `REMOVE_EQUIPMENT` / `REPLACE_EQUIPMENT` / `FEE_CHANGE` — Quyết định hành động dòng |
| **Nguồn (source)** | `MANUAL` (thủ công) / `INVENTORY_TXN` (tự động qua nhập/xuất kho) — Dùng để theo dõi |
| **Ngày hiệu lực (effectiveDate)** | Ngày áp dụng thay đổi. Điểm phân nhánh tính phí |
| **Kho (warehouseId)** | Kho nhập khi thu hồi/thay thế |
| **Dòng - action** | `ADD` / `REMOVE` / `REPLACE_OUT` / `REPLACE_IN` — Khi REPLACE thì OUT+IN sẽ là 2 dòng trong cùng một Amendment |
| **Dòng - S/N + itemId** | Định danh thiết bị đối tượng |
| **Dòng - monthlyBaseFee/salesPrice** | Đơn giá mới khi REPLACE_IN hoặc FEE_CHANGE |

### Những gì xảy ra khi lưu Amendment

1. **Tạo dòng `Amendment` + `AmendmentItem`**.
2. **Cập nhật master thiết bị** — Khi REMOVE, `removedAt = effectiveDate`; khi ADD/REPLACE_IN, tạo dòng thiết bị mới.
3. **Tự động tạo giao dịch tồn kho** — Tự động IN/OUT (chỉ khi đã chỉ định kho).
4. **Lưu lịch sử** — Bản thân Amendment tuyệt đối không bị xóa (mục đích kiểm toán).

### Kích hoạt tự động qua nhập/xuất kho

Tại `/inventory/transactions/new` sau khi nhập S/N rồi onBlur → hệ thống tra cứu ngay hợp đồng IT/TM đang hoạt động của S/N đó. Nếu phát hiện hợp đồng, modal sẽ mở ra và yêu cầu chọn 1 trong 3 ý định sau.

| Ý định | Kết quả |
|---|---|
| **Thu hồi (RECOVER)** | Tự động tạo Amendment `REMOVE_EQUIPMENT` |
| **Thay thế (REPLACE)** | Nhập SN mới → Tạo Amendment `REPLACE_EQUIPMENT` |
| **Di chuyển thông thường (NORMAL)** | Không tạo Amendment, chỉ xử lý đơn thuần như nhập/xuất kho |

Nhờ trigger này, ngay cả khi tại hiện trường chỉ xử lý nhập/xuất kho thì lịch sử hợp đồng cũng tự động được cập nhật.

## 4.4 Tính phí·Quyết toán

- **Hợp đồng IT**: Đăng ký tính phí hàng tháng → Người dùng xác nhận trong portal khách hàng (✍️ chữ ký) → Tự tạo công nợ phải thu (module tài chính).
- **TM Rental**: Tự động tính dựa trên thời hạn header/dòng → Tùy chọn tự tạo doanh thu vào ngày quyết toán.

Khách hàng ở trạng thái dừng công nợ (`BLOCKED`) vẫn được phát hành tính phí mới nhưng bị chặn tiếp nhận doanh thu·AS mới.

---

# Phần 5. AS (Dịch vụ sau bán hàng)

Module AS được cấu thành bởi hai bước: **ticket** (tiếp nhận) và **dispatch** (xuất phát đến hiện trường).

| Module | Đường dẫn | Vai trò |
|---|---|---|
| AS Ticket | `/as/tickets` | Tiếp nhận yêu cầu khách hàng·ghi nhận triệu chứng |
| AS Dispatch | `/as/dispatches` | Lịch xuất phát·sử dụng linh kiện·chữ ký |

Số tiếp nhận tự động: `YY/MM/DD-##` (ví dụ: `26/04/27-01`).

## 5.1 Tiếp nhận ticket (`/as/tickets`)

### Tiếp nhận mới — `[+ Mới]` → `/as/tickets/new`

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Khách hàng** (ClientCombobox, bắt buộc) | Lưu `AsTicket.clientId`. Khách hàng `BLOCKED` bị chặn tiếp nhận mới (cảnh báo đỏ). `WARNING` chỉ cảnh báo vàng |
| **Thiết bị / Mặt hàng** (ItemCombobox, tùy chọn) | `AsTicket.itemId` — Là model mặt hàng nào — Dùng cho thống kê·gợi ý linh kiện khớp tự động |
| **S/N** (SerialCombobox, tùy chọn) | `AsTicket.serialNumber` — **Chính sách LOOSE**: Có thể nhập dù không có trong tồn kho công ty (thiết bị bên ngoài). Khi tạo dispatch, SN này sẽ tự động được truyền sang「SN thiết bị đối tượng」 |
| **Phụ trách AS** (Select nhân viên, tùy chọn) | `AsTicket.assignedToId`. Nếu để trống thì giữ nguyên `RECEIVED` + hiển thị chưa phân công |
| **Ngôn ngữ gốc** (VI/KO/EN) | Lưu `AsTicket.originalLang`. Là ngôn ngữ được nhận diện làm bản gốc khi dịch tự động |
| **Triệu chứng (VI/KO/EN)** ≥1 trong 3 ô | Chỉ cần điền 1 ô thì khi lưu sẽ tự dịch 2 ngôn ngữ còn lại → Điền đầy đủ vào 3 cột `symptomVi/En/Ko`. Lưu khi để trống tất cả các ô sẽ là `invalid_input` |
| **Ảnh** (upload nhiều) | Tệp được upload trước vào `/api/files` (category=`PHOTO`) để được cấp fileId → Liên kết với ticket dưới dạng mảng `photoIds` |

### Những gì xảy ra khi lưu

1. **Cấp số ticket** — `YY/MM/DD-NN` (số thứ tự của ngày đó + 1).
2. **Tạo dòng `AsTicket`** — Trạng thái `RECEIVED`, `kind = AS_REQUEST`, ngày giờ tiếp nhận tự động.
3. **Lưu bản dịch 3 ngôn ngữ** — Claude API tự điền vào 2 ô ngôn ngữ chưa nhập.
4. **Thông báo nội bộ** — Nếu chưa phân công phụ trách thì gửi cho toàn bộ team AS, nếu đã phân công thì gửi cho nhân viên đó.
5. **Thông báo khách hàng** — Hiển thị ngay trên bảng「Tình trạng yêu cầu của tôi」trong portal khách hàng.

### Workflow 4 bước

```
RECEIVED → IN_PROGRESS → DISPATCHED → COMPLETED
                                     └→ CANCELED (có thể hủy ở bất cứ đâu)
```

| Trạng thái | Ý nghĩa | Trigger thay đổi |
|---|---|---|
| `RECEIVED` | Đã tiếp nhận, chờ phân công phụ trách | Tự động (đăng ký mới) |
| `IN_PROGRESS` | Đang phân công phụ trách·đang xác nhận | Thay đổi thủ công hoặc tự động khi đăng ký dispatch |
| `DISPATCHED` | Đã đăng ký xuất phát hiện trường | Tự động khi tạo dispatch |
| `COMPLETED` | Hoàn thành công việc, chờ khách hàng xác nhận | Hoàn thành dispatch + chữ ký |
| `CANCELED` | Hủy (lưu lịch sử) | Thủ công |

### Tìm kiếm ticket

Bộ lọc trạng thái (dropdown) ở đầu màn hình danh sách + thanh tìm kiếm (số tiếp nhận·khách hàng·SN). Tự động lọc trong scope công ty.

## 5.2 Dispatch (`/as/dispatches`)

Là màn hình ghi nhận thực tế việc xuất phát đối với ticket.

### Tạo dispatch — Nút `[+ Đăng ký dispatch]` ở trang chi tiết ticket

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Nhân viên xuất phát** | `AsDispatch.dispatchEmployeeId`. Tổng hợp「Số vụ xử lý theo người phụ trách」trong thống kê·KPI |
| **Phương thức vận chuyển** (tự do) | `AsDispatch.transportMethod` |
| **Địa chỉ xuất phát·đến** | `AsDispatch.originAddress/destinationAddress`. **Khi cả hai địa chỉ đều được điền** server tự động gọi Google Distance Matrix API để tự tính khoảng cách (km) |
| **Ảnh đo (OCR đồng hồ taxi)** | `meterPhotoUrl`. OCR trích km → `meterOcrKm`. So sánh với khoảng cách Google rồi tự động phán đoán `distanceMatch` (true/false) → Xác minh quyết toán phí vận chuyển |
| **Phí vận chuyển** | `AsDispatch.transportCost`. Cộng vào tổng chi phí xuất phát |
| **Tệp hóa đơn** | `receiptFileId`. Chứng từ kế toán |
| **Thời gian xuất phát/đến/hoàn thành** | `departedAt/arrivedAt/completedAt`. Tính SLA |
| **SN thiết bị đối tượng** | Ưu tiên giá trị chỉ định, nếu trống thì **SN của ticket sẽ tự propagate**. Dùng làm giá trị mặc định khi đăng ký linh kiện |
| **Ghi chú** | `AsDispatch.note` (tự do) |

### Những gì xảy ra khi lưu

1. **Tạo dòng `AsDispatch`** — Các giá trị nhập trên + kết quả tự tính khoảng cách.
2. **Tự động chuyển trạng thái ticket** — Nếu ticket đang là `RECEIVED` / `IN_PROGRESS` → `DISPATCHED`. (Nếu đã `COMPLETED`/`CANCELED` thì từ chối với `ticket_not_dispatchable`)
3. **Có thể đăng ký sử dụng linh kiện** — Có thể thêm linh kiện ở trang chi tiết dispatch (mục kế tiếp).

### Đăng ký sử dụng linh kiện·vật tư tiêu hao

Phần **Linh kiện / Parts** ở trang chi tiết dispatch — Mức độ ảnh hưởng theo từng giá trị nhập:

| Đầu vào | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **SN thiết bị đối tượng** (bắt buộc) | `AsPart.targetEquipmentSN` — Theo dõi linh kiện đã đi vào thiết bị nào. Khóa của tổng hợp「Tổng chi phí linh kiện tích lũy theo SN」trong thống kê |
| **Kho xuất** (bắt buộc) | Nguồn xuất linh kiện — `InventoryTransaction.fromWarehouseId` sẽ được tự tạo |
| **Mặt hàng** (ItemCombobox) | `AsPart.itemId`. Ưu tiên sắp xếp PART/CONSUMABLE |
| **SN linh kiện** (tùy chọn) | `AsPart.serialNumber`. Chỉ khi bản thân linh kiện có SN |
| **Số lượng** | `AsPart.quantity`. Khuyến nghị số nguyên ≥1 |
| **Ghi chú** | `AsPart.note` (tự do) |

### Những gì nút「Thêm linh kiện」làm trong một transaction

1. **Tạo dòng `AsPart`** — 1 dòng.
2. **Tự động tra đơn giá mặt hàng** → `AsPart.unitCost` (theo đơn giá bình quân tồn kho).
3. **Tính tổng** → `AsPart.totalCost` = đơn giá × số lượng.
4. **Tự tạo OUT tồn kho** — `InventoryTransaction(txnType=OUT, reason=CONSUMABLE_OUT, fromWarehouseId=kho xuất, targetEquipmentSN=SN đối tượng)`.
5. **Từ chối khi thiếu tồn kho** — Lỗi `insufficient_stock` → Hiển thị「Thiếu tồn kho — chi tiết」trên màn hình.
6. **Cập nhật tổng chi phí xuất phát** —「Tổng chi phí linh kiện」ở header dispatch được tính lại ngay.

### Tổng chi phí

| Mục | Tổng hợp |
|---|---|
| **Chi phí linh kiện** | Tổng các dòng |
| **Phí vận chuyển** | Giá trị header |
| **Tổng chi phí xuất phát** | Chi phí linh kiện + phí vận chuyển |

### Hoàn thành·Chữ ký

Khi xử lý hoàn thành (`COMPLETED`) sẽ nhận chữ ký bằng ngón tay trên di động (xác nhận khách hàng tại hiện trường). Khi chữ ký được lưu, trạng thái ticket trở thành `COMPLETED` và nút **Xác nhận** trong「Tình trạng yêu cầu của tôi」portal khách hàng được kích hoạt.

## 5.3 Ảnh và đính kèm

Cả ticket·dispatch đều có thể đính kèm ảnh. Kích thước tối đa mỗi tấm tuân theo cài đặt hệ thống (thường 10MB). Ảnh đã upload có thể tải về bằng `/api/files/{id}`.

## 5.4 Chính sách BLOCKED

Nếu khách hàng ở trạng thái `BLOCKED` thì việc tạo ticket mới sẽ bị chặn. Tự động giải tỏa sau khi xác nhận thanh toán hoặc người phụ trách tài chính giải tỏa thủ công (sách B phần 8).

---
# Phần 6. Tồn kho

Module tồn kho gồm 4 màn hình.

| Màn hình | Đường dẫn | Mục đích |
|---|---|---|
| **Tình trạng tồn kho** | `/inventory/stock` | Số lượng tồn theo mặt hàng·kho + chi tiết theo đơn vị S/N |
| **Nhập/xuất kho** | `/inventory/transactions` | Đăng ký IN/OUT/TRANSFER |
| **Quét QR** | `/inventory/scan` | Đọc QR bằng camera và nhập/xuất kho ngay lập tức |
| **Nhãn QR** | `/inventory/labels` | In nhãn QR trên giấy A4 |

Ngoài ra, thiết bị có tính chất tài sản được quản lý riêng tại **khấu hao** (`/inventory/depreciation`).

## 6.1 Tình trạng tồn kho (`/inventory/stock`)

### Số lượng tồn theo mặt hàng·kho

Bộ lọc phía trên (mặt hàng·kho) → hiển thị tổng ngay lập tức. Tham số URL là `item=` / `warehouse=`. Phản hồi có dạng `{ stock: [{ ..., onHand }] }`.

### Chi tiết theo đơn vị S/N (InventoryItem)

Khi mở rộng từng dòng, tất cả SN của mặt hàng đó được hiển thị theo trạng thái.

| Trạng thái | Ý nghĩa |
|---|---|
| `NORMAL` | Bình thường — có thể xuất ngay |
| `NEEDS_REPAIR` | Cần sửa chữa |
| `PARTS_USED` | Đã sử dụng linh kiện (tháo rời, v.v.) |
| `IRREPARABLE` | Đối tượng cần thanh lý |

Có thể thay đổi trạng thái ngay tại cùng màn hình, lý do thay đổi được tự động ghi lại tại InventoryRemark.

## 6.2 Đăng ký nhập/xuất kho (`/inventory/transactions/new`)

Xử lý 3 loại giao dịch trên cùng một màn hình.

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Loại giao dịch (txnType)** | `IN` / `OUT` / `TRANSFER` — `InventoryTransaction.txnType`. Giá trị này quyết định mức độ bắt buộc của kho xuất/nhập và tùy chọn lý do |
| **Lý do (reason)** | enum giới hạn theo loại (xem bảng tiếp theo). `InventoryTransaction.reason`. Tổng hợp thống kê 「Vòng quay theo lý do」 |
| **Số lượng (quantity)** | Số dương. `InventoryTransaction.quantity` |
| **Mặt hàng (itemId)** | Bắt buộc ItemCombobox. `InventoryTransaction.itemId` |
| **S/N** | SerialCombobox + sau khi nhập, khi onBlur sẽ **tự động tìm kiếm các hợp đồng IT/TM đang hoạt động**. Nếu phát hiện thì hiển thị modal để chọn RECOVER/REPLACE/NORMAL → có thể tự động tạo `Amendment` |
| **Scope xuất/nhập** (chỉ cho TRANSFER) | INTERNAL/EXTERNAL — INTERNAL chọn kho công ty, EXTERNAL chuyển nhánh form sang chọn khách hàng |
| **Kho xuất/nhập** | Kho công ty (khi Scope INTERNAL) → `from/toWarehouseId` |
| **Khách hàng xuất/nhập** | Khi Scope EXTERNAL → lưu nén vào một cột duy nhất `clientId` (chỉ một bên có thể là EXTERNAL trong một giao dịch) |
| **Nơi giao hàng** (chỉ cho OUT) | Khách hàng của OUT → `clientId` |
| **SN thiết bị mục tiêu** (bắt buộc khi `CONSUMABLE_OUT`) | `targetEquipmentSN`. Theo dõi vật tư tiêu hao đã được lắp vào thiết bị nào |
| **Ghi chú** | `note` (tự do) |

### Theo từng loại giao dịch (3 loại)

| Loại | Mô tả | Trường bắt buộc |
|---|---|---|
| **IN** | Nhập kho — vào kho đến | toWarehouseId |
| **OUT** | Xuất kho — rời kho xuất | fromWarehouseId + clientId |
| **TRANSFER** | Di chuyển — giữa kho xuất↔kho đến | from/to (kho hoặc khách hàng theo Scope) |

### Lý do (`reason`) — giới hạn theo loại

| Loại | Lý do có thể |
|---|---|
| **IN** | `OTHER_IN` |
| **OUT** | `CONSUMABLE_OUT` (xuất vật tư tiêu hao) |
| **TRANSFER** | `CALIBRATION` (gửi đi hiệu chuẩn) · `REPAIR` (gửi đi sửa chữa) · `RENTAL` (gửi đi cho thuê) · `DEMO` (gửi đi trình diễn) |

> **Chính sách phương án A**: Lý do mua vào·bán ra·trả hàng mua chỉ được tự động tạo từ module riêng (Mua vào·Bán ra·Adjustments). Không đăng ký thủ công ở form nhập/xuất kho.

### TRANSFER — INTERNAL ↔ EXTERNAL

Chọn **Scope** của xuất/nhập trong TRANSFER tương ứng INTERNAL/EXTERNAL.

- Cả hai bên INTERNAL → di chuyển giữa các kho công ty
- Một bên EXTERNAL → bên đó chọn **khách hàng** thay vì kho (cho thuê·sửa bên ngoài)
- Cả hai bên EXTERNAL → bất thường (một bên phải là INTERNAL)

### Tự động phát hiện hợp đồng đang hoạt động theo S/N — luồng chi tiết

Tại thời điểm rời focus khỏi ô S/N (onBlur):

1. Gọi API `GET /api/inventory/sn/{sn}/active-contracts`.
2. Tìm kiếm hợp đồng IT đang hoạt động (`itContractEquipment.removedAt = null`) + cho thuê TM đang chạy (`endDate >= hôm nay`).
3. Kết quả 0 → tự động đặt `snIntent = NORMAL`, có thể tiếp tục.
4. Kết quả ≥1 → mở modal và chọn 1 trong 3 ý định:

| Ý định | Tự động tạo khi lưu |
|---|---|
| **Thu hồi (RECOVER)** | `Amendment(type=REMOVE_EQUIPMENT)` + `items[REMOVE]` |
| **Thay thế (REPLACE)** | Nhập SN mới → `Amendment(type=REPLACE_EQUIPMENT)` + `items[REPLACE_OUT, REPLACE_IN]` |
| **Di chuyển thông thường (NORMAL)** | Không tạo Amendment, chỉ là nhập/xuất kho đơn thuần |

Vì vậy chỉ cần đăng ký 1 giao dịch nhập/xuất là lịch sử hợp đồng cũng được tự động cập nhật.

### Những việc xảy ra khi lưu

1. **Tạo dòng `InventoryTransaction`** — giá trị nhập + `companyCode` tự động.
2. **Cập nhật `InventoryItem`** (master theo đơn vị S/N) — vị trí (kho hiện tại) tự động cập nhật.
3. **Nếu ý định hợp đồng đang hoạt động là RECOVER/REPLACE thì tự động tạo Amendment** — xem bảng trên.
4. **Kiểm tra khóa** — giao dịch ở tháng đã chốt sổ kế toán bị chặn sửa sau (Sách B Phần 3).

## 6.3 Quét QR (`/inventory/scan`)

Đọc nhãn QR bằng camera điện thoại·máy tính bảng để nhập/xuất kho ngay lập tức.

### Luồng sử dụng

1. Nút **Bật camera** → cấp quyền → căn chỉnh QR vào vùng hình vuông.
2. Khi giải mã thành công, form được tự động điền (nếu là QR dạng JSON thì itemCode + serialNumber được tự động ánh xạ).
3. Chọn loại giao dịch (IN/OUT/TRANSFER) + lý do + kho/khách hàng → lưu.

### Định dạng dữ liệu QR

QR do hệ thống này phát hành là JSON `{"itemCode":"...", "serialNumber":"...", "contractNumber":"..."}`. Mã vạch/chuỗi thông thường cũng được nhận diện, trong trường hợp đó giá trị raw được điền vào trường SN.

## 6.4 Nhãn QR (`/inventory/labels`)

In nhãn QR trên giấy A4.

### 3 cỡ nhãn

| Cỡ | Mục đích |
|---|---|
| `LARGE` | Cho thân máy văn phòng — ghi đồng thời tên công ty·tên mặt hàng·SN |
| `MEDIUM` | Thông dụng |
| `SMALL` | Cho linh kiện·vật tư tiêu hao — chỉ mã |

### Đăng ký·in

1. Chọn cỡ → số tem trên một tờ được tự động tính.
2. Nhập **Mặt hàng** (ItemCombobox) + **SN** (SerialCombobox, tùy chọn) + **Số tem** → `[+ Thêm]`.
3. Các dòng đã thêm được hiển thị tích lũy. Có thể xóa dòng hoặc điều chỉnh số lượng.
4. Nút **In / Print** → hộp thoại in của trình duyệt. Sidebar·UI đều bị ẩn và chỉ in tờ nhãn.

### Tiêu đề in — Tự động xuất khi liên kết với mua vào (NEW)

Khi vào "In nhãn" từ chi tiết mua vào (URL `?purchaseId=` được tự động gắn), các thông tin sau được tự động in làm tiêu đề ở đầu tờ.

- **Nhà cung cấp** (Tên công ty Supplier)
- **Số phiếu mua vào** (Mã tự động gắn PUR-YYMMDD-###)
- **Ngày mua vào** (Ngày đăng ký phiếu mua vào tương ứng)
- **Ngày in** (Ngày hiện tại)
- **Tổng số nhãn / Cỡ nhãn**

Khi vào trực tiếp `/inventory/labels` (không liên kết mua vào), tiêu đề hiển thị "—".

### Chính sách giải mã QR (NEW)

Luồng tự ánh xạ ở màn hình quét (`/inventory/scan`):

1. **Định dạng JSON** (nhãn phiên bản cũ): Tự ánh xạ khi phát hiện key `itemCode`.
2. **Mẫu itemCode** (`ITM-YYMMDD-###`): Server fallback (`/api/master/items?q=`) tự điền itemId. Vẫn ánh xạ được kể cả ngoài phạm vi top 500 của prop client.
3. **Khác (S/N)**: Tra cứu InventoryItem qua `/api/inventory/sn/search` → tự điền itemId.
4. Các ký tự zero-width / BOM / điều khiển trong kết quả giải mã của camera di động được tự động loại bỏ.

### Tùy chọn lý do màn hình quét — Chặn mua vào/bán ra/trả hàng mua

Màn hình quét QR chỉ cho phép các lý do sau:
- **IN**: `OTHER_IN` (nhập khác)
- **OUT**: `CONSUMABLE_OUT` (xuất vật tư tiêu hao)
- **TRANSFER**: `CALIBRATION` / `REPAIR` / `RENTAL` / `DEMO`

Mua vào (PURCHASE) · Bán ra (SALE) · Trả hàng mua (RETURN_IN) **chỉ có thể tạo qua module Mua vào·Bán ra** (đảm bảo nhất quán kiểm toán·chứng từ). API chặn theo cùng chính sách.

## 6.5 Khấu hao (`/inventory/depreciation`)

Tự động tính khấu hao hàng tháng cho thiết bị có tính chất tài sản (thân máy IT, v.v.).

### Đăng ký tài sản

| Mục | Ghi chú |
|---|---|
| **Mặt hàng·SN** | ItemCombobox + SerialCombobox |
| **Ngày mua·Giá mua** | Bắt buộc |
| **Số năm sử dụng (tháng)** | Mặc định 60 |
| **Phương pháp** | `STRAIGHT_LINE` (đường thẳng) hoặc `DECLINING_BALANCE` (số dư giảm dần) |

### Xem kết quả

Thanh tìm kiếm phía trên (SN/mã mặt hàng/tên mặt hàng) → **giá trị sổ sách tháng mới nhất** theo từng tài sản được hiển thị dạng bảng. Lịch sử theo tháng gọi API riêng.

---

# Phần 7. Nhân sự

<!-- TODO vòng tới -->

---

# Phần 7. Nhân sự

Module nhân sự gồm 5 màn hình. Tất cả đều được phân tách theo công ty, và các trường nhập tự do là đối tượng **tự động dịch 3 ngôn ngữ**.

| Màn hình | Đường dẫn | Mã tự động |
|---|---|---|
| Vào làm | `/hr/onboarding` | `ONB-YYMMDD-###` |
| Nghỉ việc | `/hr/offboarding` | `OFF-YYMMDD-###` |
| Đánh giá sự việc | `/hr/incidents` | `INC-YYMMDD-###` |
| Đánh giá định kỳ | `/hr/evaluations` | `EVAL-YYMMDD-###` |
| Phép năm | `/hr/leave` | `LV-YYMMDD-###` |

> Lương (`/hr/payroll`) · Thưởng (`/hr/incentives`) chỉ hiển thị cho nhân viên nhân sự đã được cấp quyền. Nếu không thấy menu thì là trạng thái bị ẩn theo phân quyền.

## 7.1 Vào làm (`/hr/onboarding`)

Quản lý định hướng·hợp đồng·cấp phát tài sản cho nhân viên mới ở một nơi.

| Mục | Nội dung |
|---|---|
| **Thông tin cơ bản** | Người vào làm (chọn từ master nhân viên) · Ngày vào làm · Vị trí công việc |
| **Hợp đồng** | Loại hợp đồng·ngày bắt đầu·ngày kết thúc (đồng bộ với contract* của master nhân viên) |
| **Cấp phát tài sản** | Ghi nhận cấp phát theo đơn vị SN cho laptop·màn hình, v.v. — xử lý OUT từ tồn kho |
| **Danh sách kiểm tra** | Đánh dấu hoàn thành theo từng mục như tài khoản IT·đào tạo bảo mật·thẻ phúc lợi |

Khi lưu sẽ phát hành tự động `ONB-YYMMDD-###`.

## 7.2 Nghỉ việc (`/hr/offboarding`)

| Mục | Nội dung |
|---|---|
| **Thông tin cơ bản** | Người nghỉ việc · Ngày nghỉ · Lý do (đối tượng tự động dịch 3 ngôn ngữ) |
| **Thu hồi tài sản** | Ghi nhận thu hồi theo SN của tài sản đã cấp khi vào làm — xử lý IN tồn kho |
| **Vô hiệu hóa tài khoản** | Hệ thống·email·VPN, v.v. theo từng mục |
| **Bàn giao** | Người kế nhiệm + ghi chú bàn giao |

Khi xử lý xong, trạng thái master nhân viên sẽ tự động chuyển sang `TERMINATED`.

## 7.3 Đánh giá sự việc (`/hr/incidents`)

Soạn mỗi khi có sự việc cụ thể (kỷ luật·khen thưởng·chuyên cần, v.v.).

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Đối tượng** (Select nhân viên đang hoạt động) | `Incident.subjectEmployeeId`. Được thêm vào lịch sử sự việc tích lũy của nhân viên đó — tài liệu đầu vào cho hỗ trợ AI của đánh giá định kỳ |
| **Ngày sự việc** (bắt buộc) | `occurredAt`. Khóa phân tích chuỗi thời gian |
| **Loại (kind)** | DISCIPLINARY · COMMENDATION · ATTENDANCE · OTHER — phân tách thống kê theo loại |
| **Ngôn ngữ gốc** | `originalLang` (VI/KO/EN) |
| **Nội dung (contentVi/En/Ko)** | Nhập một ngôn ngữ — Claude API tự động dịch 2 ngôn ngữ còn lại. Kiểm tra **tối thiểu từ 50 ký tự trở lên** (từ chối nội dung quá ngắn). Mã sao của người soạn bắt buộc |
| **Đính kèm** | `Incident.attachmentFileId` (tùy chọn). File chứng từ |

### Những việc xảy ra khi lưu

1. **Tạo dòng `Incident`** — phát hành tự động `INC-YYMMDD-###`.
2. **Lưu trữ bản dịch 3 ngôn ngữ** — dù người soạn chỉ nhập một ngôn ngữ, cả 3 cột đều được điền.
3. **Tích lũy vào tài liệu đánh giá AI** — được dùng tự động làm ngữ cảnh khi đánh giá định kỳ.
4. **Hiển thị ưu tiên ngôn ngữ người dùng**, có toggle 「Xem nguyên văn」.

## 7.4 Đánh giá định kỳ (`/hr/evaluations`)

Đánh giá định kỳ theo quý/nửa năm/năm.

| Mục | Nội dung |
|---|---|
| **Thông tin cơ bản** | Đối tượng · Kỳ đánh giá · Người đánh giá |
| **Điểm theo hạng mục** | Năng lực chuyên môn·thái độ·thành tích, v.v. (áp dụng trọng số) |
| **Ý kiến tổng hợp** | Nhập tự do (tự động dịch 3 ngôn ngữ) |
| **Hỗ trợ AI** | `/hr/evaluations/ai` — Sinh bản nháp dựa trên dữ liệu đánh giá sự việc đã tích lũy |

Khi lưu sẽ phát hành tự động `EVAL-YYMMDD-###`.

## 7.5 Phép năm (`/hr/leave`)

### Mức độ ảnh hưởng dữ liệu theo từng giá trị nhập

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Người đăng ký** | `Leave.employeeId`. Bản thân tự động, chỉ quản trị viên mới có thể thay mặt |
| **Loại** (kind) | ANNUAL · HALF · SICK · OTHER — phân nhánh tính phép năm còn lại |
| **Ngày bắt đầu/kết thúc** | `startDate/endDate`. Số ngày được tự động tính (nửa ngày là 0.5) |
| **Lý do** | Văn bản tự do (tự động dịch 3 ngôn ngữ) |

### Những việc xảy ra khi lưu

1. **Tạo dòng `Leave`** — `LV-YYMMDD-###` + trạng thái `PENDING`.
2. **Thông báo trưởng phòng** — gửi thông báo chờ phê duyệt.
3. **Sau khi phê duyệt** → tự động trừ vào phép năm còn lại của nhân viên, tự động hiển thị trên lịch.
4. **Sau khi từ chối** → đính kèm lý do + thông báo người đăng ký.

---

# Phần 8. Tài chính - Kế toán

Module tài chính - kế toán gồm hai màn hình.

| Màn hình | Đường dẫn | Vai trò |
|---|---|---|
| Phải thu / Phải trả | `/finance/payables` | Quản lý công nợ phải thu·phải trả tự động liên kết với bán ra/mua vào |
| Chi phí | `/finance/expenses` | Chi phí vận hành chung, chi phí liên kết bán ra/mua vào |

## 8.1 Phải thu / Phải trả (`/finance/payables`)

Khi đăng ký bán ra, bản ghi **phải thu** (`RECEIVABLE`) được tự động tạo, khi đăng ký mua vào, bản ghi **phải trả** (`PAYABLE`) được tự động tạo.

### Màn hình danh sách (NEW — tìm kiếm + sắp xếp + ngày còn lại + ngày sửa đổi)

Phía trên có thẻ **Tổng chưa thanh toán (VND)**. Bảng có các cột sau.

#### Vùng bộ lọc tìm kiếm
- **Phân loại** select: Tất cả / Phải thu (RECEIVABLE) / Phải trả (PAYABLE)
- **Trạng thái** select: Tất cả / OPEN / PARTIAL / PAID / Quá hạn (OVERDUE)
- **Số phiếu** text: Khớp một phần (cả mã Sales/Purchase/Expense)
- **Khách hàng** ClientCombobox (tìm kiếm phía server)
- **Khoảng thời gian (phát hành)** Ngày bắt đầu ~ Ngày kết thúc (theo `createdAt`)
- **Khoảng thời gian (ngày dự kiến)** Ngày bắt đầu ~ Ngày kết thúc (theo `dueDate`)
- Nút [Tìm kiếm] / [Đặt lại]

#### Cột

| Cột | Ý nghĩa | Sắp xếp |
|---|---|---|
| **Phân loại** | RECEIVABLE → 「Phải thu」 / PAYABLE → 「Phải trả」 (tên đầy đủ 3 ngôn ngữ) | — |
| **Trạng thái** | Tổng hợp `OPEN` · `PARTIAL` · `PAID` · OVERDUE | — |
| **Phiếu** | Số bán ra/mua vào/chi phí gốc | — |
| **Khách hàng** | Khách hàng `BLOCKED` có badge đỏ bên cạnh tên | — |
| **Số tiền** | VND | ▲▼ |
| **Đã thu/Đã trả** | Số tiền thanh toán tích lũy | — |
| **Số dư** | `amount - paidAmount` | ▲▼ |
| **Ngày dự kiến** | `dueDate` (đặt theo điều kiện thanh toán khi phát hành lần đầu, sau đó bất biến) | ▲▼ |
| **Ngày sửa đổi** | `revisedDueDate ?? dueDate` (hạn mới sửa đổi từ chi tiết) | ▲▼ |
| **Ngày còn lại** | `hôm nay - ngày sửa đổi`. Màu sắc: âm=xanh lá (còn), 0=vàng (hôm nay), dương=đỏ (quá hạn). Nếu PAID thì để trống | ▲▼ |

Sắp xếp mặc định: **Ngày còn lại giảm dần** (số quá hạn lớn ở trên cùng).

> **Ngày dự kiến vs Ngày sửa đổi**: Ngày thanh toán dự kiến được tự đặt khi phát hành lần đầu là `dueDate` (bất biến). Khi nhập kết quả đàm phán hạn từ chi tiết thì lưu vào `revisedDueDate`. Việc xác định ngày còn lại·quá hạn dựa theo ngày sửa đổi.

### Màn hình chi tiết — Mức độ ảnh hưởng theo từng giá trị nhập

`/finance/payables/[id]` — Hai mục + mức độ ảnh hưởng đầu vào:

#### Thêm Lịch sử liên hệ (PrContactLog)

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Ngày** | `PrContactLog.contactDate` |
| **Phương thức liên hệ** | `method` — PHONE/EMAIL/VISIT/CHAT |
| **Nội dung liên hệ (1 trong 3 ngôn ngữ)** | `contactNoteVi/En/Ko` — Khi nhập một ngôn ngữ thì tự động dịch |
| **Phản hồi của khách (1 trong 3 ngôn ngữ)** | `responseVi/En/Ko` — Tương tự |

#### Thêm Lịch sử thanh toán (PrPayment)

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Số tiền thanh toán** | `PrPayment.amount`. Tự động cộng dồn vào `paidAmount` của PR |
| **Ngày thanh toán** | `paidAt` |
| **Phương thức thanh toán** | `method` — BANK/CASH/CARD/OTHER |
| **Ghi chú** | Tự do |

#### Những việc tự động xảy ra khi đăng ký thanh toán

1. **Cập nhật `paidAmount` của PR** = SUM(PrPayment.amount).
2. **Tự động chuyển `status` của PR** — `paidAmount = 0` → `OPEN`, `0 < paidAmount < amount` → `PARTIAL`, `paidAmount >= amount` → `PAID`, `dueDate < hôm nay` → `OVERDUE`.
3. **Tính lại `receivableStatus` của khách hàng** — Tự chuyển đổi `NORMAL` ↔ `WARNING` ↔ `BLOCKED` theo biến động phải thu tích lũy.
4. **Kiểm tra khóa chốt sổ kế toán** — Đăng ký thanh toán cho PR ở tháng đã khóa bị chặn (Sách B Phần 3).

### Tải xuống Excel

Nhấn nút `[Excel]` ở góc trên phải để tải kết quả lọc hiện tại dưới dạng .xlsx.

## 8.2 Chi phí (`/finance/expenses`)

Đăng ký chi phí vận hành chung và phân bổ (allocations) vào bán ra/mua vào.

### Đăng ký mới — Mức độ ảnh hưởng theo từng giá trị nhập

| Đầu vào | **Việc giá trị này thực hiện trong hệ thống** |
|---|---|
| **Mã tự động** | `EXP-YYMMDD-###` (phát hành tự động) |
| **Loại chi phí (expenseType)** | `GENERAL` / `PURCHASE` / `SALES` / `TRANSPORT` — Khi chọn `SALES`/`PURCHASE` thì ID bán ra/mua vào liên kết trở thành bắt buộc |
| **Số tiền·Loại tiền·Tỷ giá** | `amount/currency/fxRate`. Thống kê dùng giá trị quy đổi VND |
| **Ngày phát sinh** | `incurredAt`. Tiêu chí xác định tháng chốt sổ kế toán (khóa) |
| **Bán ra/Mua vào liên kết** | Khi `SALES` thì `linkedSalesId`, khi `PURCHASE` thì `linkedPurchaseId` bắt buộc. Hiển thị là 「Chi phí liên quan」 trong chi tiết bán ra/mua vào |
| **Ghi chú** | `note` (tự do) |

### Những việc xảy ra khi lưu

1. **Tạo dòng `Expense`**.
2. **Tính lại lãi/lỗ của bán ra/mua vào liên kết** — phản ánh ngay vào thống kê.
3. **Kiểm tra chốt sổ kế toán** — Nếu `incurredAt` thuộc tháng đã khóa thì cũng chặn đăng ký mới.

### Allocations (Phân bổ)

Phân bổ một chi phí theo tỷ lệ vào nhiều bán ra/mua vào hoặc phòng ban·dự án. Đăng ký theo dòng tại tab **Phân bổ / Allocations** của trang chi tiết chi phí.

Bị ảnh hưởng bởi chính sách chốt sổ (khóa) kế toán — Sửa·xóa chi phí thuộc tháng đã khóa bị chặn (Sách B Phần 3).

---

# Phần 9. Họp / Lịch / Tin nhắn

## 9.1 Báo cáo tuần / Biên bản họp (`/weekly-report`)

Quản lý tích hợp báo cáo công việc theo tuần và ghi chép cuộc họp.

### Cấu trúc màn hình — 2 panel

| Panel | Nội dung |
|---|---|
| **Tasks** | Công việc đang tiến hành — chỉ thị/nội dung (3 ngôn ngữ), người phụ trách, trạng thái |
| **Backlog** | Công việc tồn đọng tích lũy + lịch sử theo khách hàng |

### Tasks — Tác động theo giá trị nhập

| Nhập | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Chỉ thị (instructionVi/En/Ko)** | Khi nhập 1 ngôn ngữ sẽ tự động dịch sang 3 ngôn ngữ. Cột `WeeklyReportTask.instruction*` |
| **Nội dung (contentVi/En/Ko)** | Cùng pattern. Báo cáo chi tiết, kết quả tiến hành |
| **Người phụ trách** | `ownerEmployeeId`. Tổng hợp thống kê “Khối lượng xử lý công việc” |
| **Trạng thái** | TODO/IN_PROGRESS/DONE — phân nhánh đếm tồn đọng ở lịch và dashboard |

Hiển thị tự động chọn ngôn ngữ khả dụng theo thứ tự: ngôn ngữ người dùng → VI → KO → EN (hàm `pick3`).

### Backlog — Tác động theo giá trị nhập

| Nhập | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Khách hàng** (ClientCombobox) | `Backlog.clientId`. Tích lũy công việc tồn đọng theo khách hàng |
| **Lịch sử công việc** (tự động dịch 3 ngôn ngữ) | Tích lũy theo khách hàng — tự động hiển thị ở mục “Công việc tồn đọng gần đây” trong màn hình Bán hàng/AS |

## 9.2 Lịch (`/calendar`)

Chuyển đổi giữa các chế độ xem tháng/tuần/ngày. Tất cả các lịch trình đăng ký ở `/master/schedules` cùng các sự kiện chung của công ty đều hiển thị. Click vào thẻ lịch trình → xem chi tiết / chỉnh sửa.

## 9.3 Chat (`/chat`)

Tin nhắn thời gian thực dựa trên WebSocket.

### Nhập tin nhắn — Tác động dữ liệu

| Nhập | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Nội dung tin nhắn** (nhập 1 ngôn ngữ) | Khi gửi, Claude API sẽ tự động điền đầy đủ 3 cột ngôn ngữ (`contentVi/En/Ko`) |
| **Tệp đính kèm** (tùy chọn) | Upload `/api/files` → liên kết `messageFiles` |
| **Người nhận (DM)** | Chỉ tìm kiếm được nhân viên trong phạm vi công ty — chế độ ALL của ADMIN có thể tìm cả hai pháp nhân |

### Tùy chọn hiển thị

Người nhận có thể chọn hiển thị 1/2/3 ngôn ngữ trên màn hình (ví dụ: chỉ KO / KO+VI / KO+VI+EN). Đồng nghiệp phía Việt Nam có thể đọc ngay tin nhắn người Hàn gửi bằng tiếng Việt.

### Chat mới (`/chat/new`)

| Nhập | **Vai trò của giá trị này trong hệ thống** |
|---|---|
| **Đối tác** (đơn/nhiều) | DM hoặc nhóm chat. Khi gửi tin nhắn đầu tiên, `ChatRoom` được tạo tự động |
| **Tên phòng** (chỉ với nhóm) | `ChatRoom.name`. Tự do |

---

# Phần 10. Thống kê (chỉ xem)

> Nhân viên thông thường chỉ được cấp **quyền xem**. Hãy sử dụng như công cụ phân tích. Phân tích KPI/lợi nhuận theo S/N chuyên sâu được trình bày trong Sách phụ **B — Phần 7** dành cho quản trị viên.

Menu `/stats` gồm 4 tab.

| Tab | Nội dung |
|---|---|
| **Doanh thu / Bán hàng** | Xu hướng doanh thu theo tháng, tổng hợp theo khách hàng/dự án, hiệu suất nhân viên kinh doanh |
| **Rental / AS** | Số hợp đồng IT/TM đang hoạt động, thanh toán/quyết toán theo tháng, thời gian xử lý AS (SLA) |
| **Tồn kho / Nhân sự** | Vòng quay theo mặt hàng, nhân sự theo phòng ban, phân bố điểm đánh giá |
| **Tài chính** | Xu hướng số dư công nợ phải thu, tổng hợp chi phí theo danh mục, tóm tắt quy đổi tiền tệ |

### Mẹo sử dụng

- Mọi biểu đồ đều **tự động áp dụng phạm vi công ty** (tách TV/VR hoặc tra cứu hợp nhất).
- Có thể tải dữ liệu raw dưới dạng .xlsx bằng nút `[Excel]` ở góc trên phải bảng.
- Phân tích chi tiết (lợi nhuận theo S/N, TCO v.v.) cần quyền ADMIN — tham khảo Sách phụ B Phần 7.

---

# Phụ lục A — Bảng mã tự động (tóm tắt)

| Đối tượng | Định dạng | Ghi chú |
|---|---|---|
| Khách hàng | `CL-YYMMDD-###` | Số thứ tự theo ngày |
| Mặt hàng   | `ITM-YYMMDD-###` | Số thứ tự theo ngày |
| Nhân viên  | `TNV-###` (TV) / `VNV-###` (VR) | **Số thứ tự theo công ty, không có YYMMDD** |
| Hợp đồng IT | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | |
| Rental TM | `TM-YYMMDD-###` | |
| Phiếu AS | `YY/MM/DD-##` | Ngăn cách bằng dấu gạch chéo |
| Đánh giá   | `INC-YYMMDD-###` (sự cố) / `EVAL-YYMMDD-###` (định kỳ) | |
| Vào/Ra việc | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| Nghỉ phép  | `LV-YYMMDD-###` | |
| Chi phí    | `EXP-YYMMDD-###` | |
| Lịch trình | `SCH-YYMMDD-###` | |
| License    | `LIC-YYMMDD-###` | |

---

# Phụ lục B — Chính sách mã công ty (tóm tắt)

- Mã công ty chỉ có hai giá trị: `TV` hoặc `VR`.
- Khi đăng nhập, người dùng chọn → cố định trong toàn phiên → tự động chèn vào mọi truy vấn.
- Người dùng có `allowedCompanies` từ hai trở lên (chủ yếu là ADMIN/MANAGER) có thể chuyển sang chế độ tra cứu hợp nhất (`ALL`) qua company picker trên sidebar.
- Master dùng chung (`clients`, `items`, `warehouses`) không có mã công ty — hai pháp nhân nhìn thấy cùng dữ liệu.
- Mọi dữ liệu nghiệp vụ khác đều bắt buộc có mã công ty — bắt buộc bằng index.

---

# Phụ lục C — Tự động dịch 3 ngôn ngữ (tóm tắt)

Các trường tự do (triệu chứng AS, đánh giá sự cố, ghi chú, yêu cầu v.v.) đều được lưu dưới dạng **3 cột ngôn ngữ + originalLang**.

- Người dùng chỉ nhập 1 ngôn ngữ → khi lưu, Claude API tự động dịch sang 2 ngôn ngữ còn lại.
- Hiển thị ngay theo ngôn ngữ đã chọn ở sidebar, kiểm tra ngôn ngữ khác bằng nút bật tắt “Xem nguyên văn”.
- Chỉ ADMIN mới được sửa kết quả dịch.
- Tên người, danh từ riêng cũng xử lý tương tự nhưng phiên âm có thể không tự nhiên — khuyến nghị nhập trực tiếp khi cần.

---

# Phụ lục D — Hướng dẫn tải xuống / tải lên (lưu ý và mẹo theo module)

Tổng hợp các vấn đề thường gặp và cách xử lý nhanh khi sử dụng chức năng tải lên/tải xuống Excel. Mọi màn hình tải lên đều hiển thị chung ba nút: 「📤 Excel upload」 / 「📋 Empty template」 / 「📥 Download Excel」.

## D.1 Mục chung (tất cả module)

- **Bắt buộc 1 dòng tiêu đề** — Dòng đầu tiên phải có tên cột. Dữ liệu bắt đầu từ dòng 2.
- **Ô trống = null** — Để trống nghĩa là không nhập trường đó. Nhưng cột bắt buộc nếu để trống sẽ bị từ chối theo dòng.
- **Giá trị tham chiếu (mã khách hàng/mặt hàng/nhân viên v.v.) phải khớp chính xác với DB** mới mapping được. Phân biệt hoa thường, khoảng trắng.
- **Trường tự dịch 3 ngôn ngữ** (triệu chứng, ghi chú v.v.) chỉ cần điền 1 ngôn ngữ là OK — khi lưu sẽ tự điền 2 ngôn ngữ còn lại.
- **Mã tự cấp (`SLS-`/`PUR-`/`ITM-` v.v.)** nếu để trống thì server tự điền. Chỉ định thủ công có thể xung đột.
- **Thông báo lỗi = số dòng + trường + lý do** dạng. Ví dụ: "Dòng 4 (ITM-D330): description — bắt buộc nhưng đang trống" cho biết chính xác dòng nào trường nào.
- **Cho phép thất bại một phần** — chỉ cần sửa lại các dòng lỗi rồi tải lên lại (dòng thành công là upsert idempotent nên không bị trùng).
- **Khuyến nghị tải theo lô** — mỗi lần 100~500 dòng. Hơn nữa thì chia ra (kiểm tra ngay kết quả/lỗi từng lần, an toàn).

> 💡 **Mẹo**: Trước khi tạo file lớn, hãy thử với file nhỏ 5~10 dòng trước. Tốt cho việc kiểm tra khớp tiêu đề, sót trường bắt buộc.

## D.2 Khách hàng (`/master/clients`)

| Cột | Bắt buộc | Ghi chú |
|---|:-:|---|
| `clientCode` | ☐ | Để trống = tự cấp `CL-YYMMDD-###` |
| `companyNameVi` | ☑ | Tên công ty tiếng Việt (key tìm kiếm chính) |
| `companyNameKo` | ☐ | Để trống thì tự dịch |
| `companyNameEn` | ☐ | Để trống thì tự dịch |
| `taxCode` (MST) | ☐ | Mã số thuế Việt Nam — chặn đăng ký lại cùng giá trị |
| `bankAccount/Holder/BankName` | ☐ | Thông tin thanh toán |
| `paymentTerms` | ☐ | Số ngày (mặc định 30) |
| `address/phone/email` | ☐ | Thông tin liên hệ |

⚠️ **Lưu ý**: Nếu `taxCode` trùng với khách hàng khác sẽ báo lỗi. Khi gộp khách hàng, đổi tên thì khuyến nghị sửa hàng hiện có (PATCH).
💡 **Mẹo**: 5~10 khách hàng mới thì đăng ký trực tiếp nhanh hơn. Từ 30 trở lên dùng Excel. Dữ liệu export từ ECOUNT thì dùng công cụ ECOUNT import riêng (xem manual B).

## D.3 Mặt hàng (`/master/items`)

13 cột Excel upload — định nghĩa chi tiết xem 1.2 phần thân. Đây chỉ liệt kê các bẫy thường gặp:

⚠️ **Trường bắt buộc** (kiểm tra từng dòng):
- Tất cả dòng: `itemType`, `name`, `description`
- `CONSUMABLE`/`PART`: thêm `compatibleItemCodes` ít nhất 1 mục

⚠️ **Trên dòng PRODUCT, các cột sau dù điền cũng bị bỏ qua** (tránh nhầm lẫn):
- `colorChannel`, `expectedYield`, `yieldCoverageBase`, `compatibleItemCodes`, `parentItemCode`, `bomQuantity`, `bomNote`

⚠️ **Liên kết BOM cha (parentItemCode)** bắt buộc dòng cha phải tồn tại sẵn trong cùng file hoặc trong DB. Đăng ký cha trước, con sau.
- Trường hợp đăng ký cả cha và con trong cùng file: thứ tự dòng trong file không quan trọng (server xử lý Phase 1 rồi Phase 3).

⚠️ **BOM tối đa 3 cấp** — Nỗ lực đăng ký con của linh kiện Level 3 sẽ bị bỏ qua.

⚠️ **Mapping tương thích** (compatibleItemCodes): ngăn cách bằng dấu chấm phẩy (`;`). Ví dụ: `ITM-010;ITM-011`.
- Nếu PRODUCT được mapping không có trong DB thì chỉ mapping đó bị bỏ qua (dòng vẫn thành công).

💡 **Mẹo**:
- **Pattern đăng ký theo dòng sản phẩm**: 1 PRODUCT thân máy → 4 loại toner tương thích (BLACK/CYAN/MAGENTA/YELLOW) → A'ssy → con của A'ssy. Có thể điền tất cả trong 1 sheet.
- **Bổ sung sau khi seed**: Để chỉ điền expectedYield cho toner đã seed sẵn thì chỉ cần ghi itemCode và cột cần thay đổi rồi upload (upsert). Tuy nhiên việc thiếu thiết bị tương thích sẽ gây lỗi — đã mapping rồi thì xóa lại không bị bỏ qua nên khuyến nghị sửa ở màn hình PATCH.
- **Hàng trăm dòng một lần**: khuyến nghị dưới 500 dòng, giới hạn 2000 dòng. 500 dòng ≈ 12 giây.
- **Tải xuống**: 「📥 Download Excel」 → chỉ kết quả đã filter hiện tại. Không phải backup toàn bộ.

## D.4 Bán hàng / Mua hàng (`/sales`, `/purchases`)

⚠️ **Bắt buộc**:
- Bán: `clientCode`, `projectCode`, mỗi dòng `itemCode`/`quantity`/`unitPrice`
- Mua: `supplierCode`, `projectCode`, thông tin dòng

⚠️ **`projectCode` thuộc phạm vi công ty**. TV/VR cùng mã thì là dự án khác nhau. Chỉ thử khớp với dự án của công ty trong phiên hiện tại.

⚠️ **Dòng bán TRADE = tự động OUT kho**. Áp dụng kiểm tra S/N 3 lớp cho mỗi dòng — SN đã xuất, SN của hợp đồng IT/TM đang hoạt động sẽ bị từ chối.
⚠️ **S/N của dòng mua = nhập kho mới**. Xung đột với SN đã có trong kho sẽ bị từ chối.

💡 **Mẹo**:
- **Bán hàng ngoại tệ**: nhập USD/KRW/JPY/CNY vào cột `currency` + ghi rõ `fxRate`. VND để trống thì tự động 1.0.
- **Bán hàng CALIBRATION**: điền các cột `certNumber/certDate/certPdf` của dòng → tự động hiển thị trên cổng khách hàng.
- **Thất bại một phần**: chỉ cần 1 dòng bị từ chối SN là cả header bán hàng đó bị từ chối. Không có chuyện một phần dòng thành công.

## D.5 Thiết bị hợp đồng IT (`/rental/it-contracts/[id]` → upload hàng loạt)

Dùng khi đăng ký một lúc hàng trăm thiết bị.

⚠️ **Bắt buộc**: `serialNumber`, `itemCode`. Còn lại đều tùy chọn nhưng khi dùng SNMP tự thu thập thì khuyến nghị `deviceModel`.

⚠️ **Kiểm tra tồn kho STRICT** — chỉ qua các SN đã đăng ký trong tồn kho công ty (`InventoryItem`). Thiết bị thuê ngoài thì xử lý ở màn hình đăng ký trực tiếp với chế độ LOOSE.

💡 **Mẹo**:
- **Kích hoạt SNMP tự thu thập**: điền `deviceModel` (ví dụ: `SAMSUNG_X7500`) và phát hành token. `deviceIp` có thể để trống — agent sẽ tự quét và điền.
- Cột **resetAt**: ngày reset counter khi thay mainboard v.v. Sau đó tính lượng dùng tính phí sẽ bỏ qua giá trị prev.

## D.6 Rental TM / Tồn kho / AS

- **Rental TM** (`/rental/tm-rentals`): N dòng. Mỗi dòng bắt buộc `startDate/endDate`. Khi thu hồi thay đổi endDate hoặc xử lý ở màn hình riêng.
- **Nhập xuất kho** (`/inventory/transactions`): có thể đăng ký hàng loạt nhưng **mua/bán/trả mua chỉ được làm ở module mua/bán**. Excel có lý do PURCHASE/SALE/RETURN_IN sẽ không bị bỏ qua mà bị từ chối.
- **Cử người AS** không hỗ trợ upload hàng loạt (đăng ký từng cái). **Ảnh cử người** thì upload trực tiếp từ mobile (D.8).

## D.7 Nhân sự (vào việc, nghỉ việc, nghỉ phép)

⚠️ Vào/nghỉ việc lấy **PDF tự cấp** làm trọng tâm — hầu như không dùng upload Excel. Đăng ký trên form theo mẫu.
⚠️ Nghỉ phép có thể đăng ký nhiều theo ngày — cùng nhân viên cùng ngày trùng lặp sẽ bị từ chối.

## D.8 Upload ảnh / file (chung mobile và web)

- **Ảnh đồng hồ AS** — chụp ngay từ camera mobile. Tự động nén JPEG (mục tiêu ~500KB).
- **Chữ ký khách hàng** — HTML5 Canvas → lưu base64 PNG. Để nhúng vào PDF.
- **PDF chứng nhận hiệu chuẩn thiết bị đo** — đính kèm `certPdf` của dòng khi đăng ký bán hàng. Đối tượng tải về của cổng khách hàng.
- **Ảnh cá nhân/CMND** — cột `idCardPhotoUrl`. Theo chính sách công ty, chỉ phụ trách nhân sự có quyền mới tải xuống được.

⚠️ **Kích thước file**: khuyến nghị mỗi file dưới 10MB. Lớn hơn thì nén rồi upload (nguy cơ trình duyệt treo).
⚠️ **Định dạng**: chỉ JPEG/PNG/PDF. HEIC (mặc định iPhone) không tự chuyển đổi — khuyến nghị chọn “Định dạng tương thích nhất” trong cài đặt camera điện thoại.
💡 **Mẹo**: Chụp ảnh trên mobile và đính kèm trực tiếp thì sẽ tự xoay và nén. PC chuyển qua thư mục khác rồi upload có thể mất metadata xoay.

## D.9 Tải xuống — pattern thường dùng

| Tải xuống | Vị trí | Ghi chú |
|---|---|---|
| Excel bán/mua/khách hàng/mặt hàng | 「📥 Download Excel」 góc trên phải mỗi màn hình list | Chỉ kết quả filter/tìm kiếm hiện tại |
| PDF xác nhận lượng dùng | 「📄 PDF」 trên dòng `/admin/usage-confirmations` | Tạo bằng pdf-lib, nhúng Noto Sans CJK |
| Ảnh cử người AS | Chi tiết cử người → thẻ ảnh → click chuột phải lưu | Không hỗ trợ tải nhiều |
| Chứng nhận hiệu chuẩn | Dòng bán hàng → thẻ chứng nhận → tải xuống | Cùng file với cổng khách hàng |
| Sheet nhãn QR | `/inventory/labels` → 「In / Print」 | Sheet A4, kèm ID mua hàng tự động header |
| Báo cáo tỷ lệ phù hợp | `/admin/yield-analysis` → (CSV/Excel sẽ thêm sau) | Hiện chỉ có bảng trên màn hình |
| Audit log | `/admin/audit-logs` → cần quyền riêng | Lo ngại dung lượng lớn, có phân trang |

💡 **Mẹo**: Tải xuống Excel dựa trên “trạng thái màn hình hiện tại”. Hãy điều chỉnh trước tìm kiếm/filter rồi tải xuống.

---

# Phụ lục E — Tính năng mới gần đây (tính đến 2026-04-30)

## E.1 Workflow 4 bước cho Bán hàng (Mock Sales)

Thêm badge các bước + KPI + tìm kiếm trên màn hình bán hàng `/sales`.

| Bước | Badge | Ý nghĩa | Người thực hiện |
|---|---|---|---|
| 🟡 Chờ kỹ thuật | TECH | Chưa hoàn tất xác nhận lượng dùng SNMP | Đội kỹ thuật |
| 🟠 Chờ phát hành Sales | SALES | Đã xác nhận lượng dùng + chờ Sales [Phát hành bán hàng] | Sales |
| 🔵 Chờ CFM Tài chính | FINANCE | Sales đã phát hành + chờ Tài chính [CFM] | Tài chính |
| 🟢 Hoàn tất | DONE | Tài chính đã CFM (lock) | — |

- Cron 09:00 KST mùng 1 hàng tháng tự động phát hành — phát hành 1 bản DRAFT bán hàng tháng trước cho mọi hợp đồng IT/TM ACTIVE.
- Khi xác nhận lượng dùng ADMIN_CONFIRMED, DRAFT bán hàng cùng (hợp đồng, tháng) tự động đồng bộ — điền cả các dòng lượng dùng phát sinh thêm.
- Trong chi tiết bán hàng click [🟠 Phát hành bán hàng] → isDraft=false + tự động phát hành công nợ phải thu.
- Sau khi Tài chính CFM thì PATCH thông thường bị chặn (lock). Chỉ ADMIN mới mở khóa được.

## E.2 Rental IT/TM — Nút kết thúc sớm 🛑

Góc trên phải header chi tiết hợp đồng **🛑 Kết thúc hợp đồng (sớm/bình thường)** — nhập ngày kết thúc / lý do / trạng thái (COMPLETED/CANCELED) → tự động:
- Thay đổi endDate + thay đổi status
- Thu hồi mọi thiết bị đang hoạt động (`removedAt = ngày kết thúc`)
- Xóa các DRAFT bán hàng của tháng sau ngày kết thúc

## E.3 Cổng khách hàng — Trang chi tiết “Yêu cầu của tôi”

`/portal/requests/[id]` — vào khi click số ticket trên trang chính cổng khách hàng:
- Loại / trạng thái / người phụ trách / ngày hoàn tất
- Nếu là AS thì full text triệu chứng / nếu là vật tư tiêu hao thì bảng mặt hàng yêu cầu
- **Timeline tiến độ** — 📥 Tiếp nhận → 🚚 Cử người #1 (người phụ trách, linh kiện sử dụng) → ✅ Hoàn tất hoặc ⏳ Chờ

## E.4 Tồn kho — Ghi chú trạng thái hiện tại + Phân loại đạt/không đạt

Trường mới của InventoryItem:
- `stateNoteVi/En/Ko` — text tự do (tự động dịch 3 ngôn ngữ khi lưu)
- Phân loại đạt/không đạt giữ nguyên enum `status` hiện có:
  - 🟢 Đạt = `NORMAL`
  - 🔴 Không đạt = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

UI: `/inventory/stock` → mở rộng SN → thay đổi trạng thái + nhập Remark. Form nhập trường stateNote mới sẽ được bổ sung trong công việc UI tiếp theo.

## E.5 Tìm kiếm tương thích + BOM 3 cấp + colorChannel

Tham khảo phần thân manual A 6.x — đã áp dụng.

## E.6 Yêu thích sidebar ❤

Click trái tim ♡ bên phải mỗi menu → chuyển sang ♥ đỏ + tự động hiển thị trong nhóm "❤ Yêu thích" trên đầu sidebar. Lưu trong localStorage.

## E.7 Mở rộng chiều rộng trang

Các trang sau được mở rộng từ `max-w-6xl` (1109px) → `max-w-screen-2xl` (1366px):
- Bán hàng (`/sales`)
- Tiếp nhận AS (`/as/tickets`)
- Cử người AS (`/as/dispatches`)

Giải quyết vấn đề bảng bị cắt theo chiều ngang.
