---
title: "Tellustech ERP — Sổ tay Quản trị viên"
subtitle: "Dành riêng cho ADMIN / MANAGER"
author: "Đội ngũ Tellustech IT"
date: "2026-04"
lang: vi
---

# Lời nói đầu

Tài liệu này dành cho người dùng có quyền ADMIN / MANAGER tham khảo khi sử dụng các chức năng **vận hành và ra quyết định chính sách** của ERP.

- Chức năng dành cho người dùng thông thường → tập riêng **A — Hướng dẫn sử dụng**
- Cổng thông tin khách hàng → tập riêng **C — Hướng dẫn cổng khách hàng**

Tập này bao gồm 8 lĩnh vực sau.

1. Quản lý quyền — Kiểm soát truy cập module theo từng người dùng
2. Đóng sổ kế toán — Khóa/mở khóa theo tháng
3. Thùng rác — Khôi phục các hàng đã Soft-delete
4. Nhật ký kiểm toán — Theo dõi INSERT/UPDATE/DELETE
5. Ánh xạ tương thích — M:N giữa hàng chính ↔ vật tư tiêu hao/linh kiện
6. Xem chi tiết thống kê — KPI / lợi nhuận theo S/N
7. Vận hành hệ thống — Sao lưu, triển khai, biến môi trường
8. Phụ lục — Mã tự động, chính sách công ty, S/N, dịch thuật, chữ ký

---

# Phần 1. Tổng quan quyền quản trị viên

## 1.1 4 vai trò (role)

| Vai trò | Sidebar | Bộ chọn công ty | Ma trận quyền |
|---|---|---|---|
| `ADMIN` | Toàn bộ module + nhóm quản trị | TV/VR/ALL | Tự động `WRITE` cho mọi module (bỏ qua UserPermission) |
| `MANAGER` | Toàn bộ module + nhóm quản trị | TV/VR/ALL | Áp dụng UserPermission (chỉ các module được chỉ định) |
| `EMPLOYEE` | Chỉ các module được cấp quyền | Chỉ công ty của mình | Áp dụng UserPermission |
| `CLIENT` | Chỉ cổng khách hàng, chặn màn hình nội bộ | – | Riêng biệt |

> `ADMIN` được tự động cấp `WRITE` cho mọi module. `MANAGER` có thể truy cập màn hình ADMIN nhưng quyền theo từng module thì cần được cấp riêng.

## 1.2 3 cấp độ quyền

| Cấp độ | Ý nghĩa |
|---|---|
| `HIDDEN` | Ẩn khỏi sidebar, chặn cả API GET |
| `VIEW` | Chỉ xem được, chặn tạo/sửa/xóa |
| `WRITE` | Có thể tạo, sửa, xóa |

Việc thay đổi cấp độ có hiệu lực ngay, nhưng nếu người dùng đã mở sẵn trang thì cần làm mới (refresh).

## 1.3 Phạm vi công ty và chế độ xem hợp nhất

- Người dùng có `allowedCompanies` chỉ một (`["TV"]` hoặc `["VR"]`) chỉ xem được dữ liệu của công ty đó.
- ADMIN/MANAGER thường có cả `["TV","VR"]`, sidebar sẽ hiển thị bộ chọn công ty (`TV` / `VR` / `ALL`).
- Chế độ xem hợp nhất `ALL` → mọi màn hình đều hiển thị tổng hợp 2 công ty. Tuy nhiên, **việc đăng ký mới chỉ nên thực hiện trong ngữ cảnh công ty được chỉ định rõ ràng** (để bảo toàn tiền tố công ty trong việc cấp mã tự động).

## 1.4 Phân tách quyền vs công ty

Cùng một module, hai yếu tố sau hoạt động độc lập với nhau.

1. **Quyền (UserPermission)** — Khả năng xem/ghi theo từng module.
2. **Phạm vi công ty (companyScope)** — Phạm vi dữ liệu được nhìn thấy.

Ngay cả ADMIN, trong phiên `companyCode=TV` cũng không xem được dữ liệu VR. Phải chuyển sang chế độ `ALL`.

---

# Phần 2. Quản lý quyền (`/admin/permissions`)

## 2.1 Cấu trúc màn hình

Bên trái là **danh sách người dùng** (trừ CLIENT), bên phải là **ma trận 31 module × 3 cấp độ**.

## 2.2 Tổ chức 31 module theo nhóm

| Nhóm | Khóa module |
|---|---|
| **Master** | `CLIENTS` · `ITEMS` · `WAREHOUSES` · `EMPLOYEES` · `DEPARTMENTS` · `PROJECTS` · `LICENSES` · `SCHEDULES` |
| **Kinh doanh** | `SALES` · `PURCHASES` |
| **Cho thuê** | `IT_CONTRACTS` · `TM_RENTALS` |
| **AS** | `AS_TICKETS` · `AS_DISPATCHES` · `CALIBRATIONS` |
| **Kho** | `INVENTORY` |
| **Nhân sự** | `HR_LEAVE` · `HR_ONBOARDING` · `HR_OFFBOARDING` · `HR_INCIDENT` · `HR_EVALUATION` · `HR_PAYROLL` · `HR_INCENTIVE` |
| **Tài chính** | `FINANCE_PAYABLE` · `FINANCE_RECEIVABLE` · `FINANCE_EXPENSE` |
| **Phân tích · Liên lạc** | `STATS` · `CHAT` · `CALENDAR` |
| **Quản trị** | `AUDIT` · `ADMIN` |

## 2.3 Tác động dữ liệu theo từng giá trị nhập

| Nhập / Hành động | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **Chọn người dùng** (bên trái) | Gọi API `GET /api/admin/permissions/{userId}` → điền cấp độ hiện tại vào bảng bên phải. Vai trò CLIENT bị loại khỏi danh sách |
| **Radio module** (HIDDEN/VIEW/WRITE) | Chỉ phản ánh vào trạng thái client — DB chưa thay đổi cho đến khi lưu |
| **Nút Lưu** | API `PUT /api/admin/permissions/{userId}` body=toàn bộ ma trận → upsert tất cả 31 module |
| **Hiệu lực tức thì** | Khi người dùng chuyển trang lần sau, sidebar sẽ tự ẩn. Trang đang mở sẵn cần làm mới |

## 2.4 Những gì xảy ra khi lưu

1. **Upsert hàng loạt bảng `UserPermission`** — toàn bộ 31 dòng (cả dòng level=HIDDEN cũng lưu rõ ràng).
2. **Vô hiệu hóa cache quyền của người dùng đó** — lần gọi `/api/auth/me` tiếp theo sẽ áp dụng ma trận mới.
3. **Ghi nhật ký kiểm toán** — `tableName=user_permissions`, action=`UPDATE`, ma trận before/after dạng JSON.
4. **Áp dụng ẩn sidebar tức thì** — lần load trang tiếp theo sẽ tự ẩn menu thông qua ánh xạ `KEY_TO_MODULE`.

## 2.5 Quy trình cấp/thu hồi

1. Chọn người dùng ở bên trái → quyền hiện tại hiển thị ngay trên bảng bên phải.
2. Thay đổi radio cho từng module (`HIDDEN` / `VIEW` / `WRITE`).
3. Nút **Lưu** ở dưới → gọi API.
4. Hướng dẫn người dùng đã thay đổi làm mới trang.

## 2.4 Khuyến nghị bảo mật

- Module nhân sự, tài chính nên đặt `HIDDEN` cho người không phụ trách — bảo vệ thông tin nhạy cảm như lương, công nợ.
- Tối thiểu hóa vai trò `ADMIN` — nếu có thể, dùng `MANAGER` + chỉ `WRITE` các module cần thiết.
- Nhân viên mới mặc định `EMPLOYEE` + chỉ `WRITE` module công việc của họ, các module còn lại bắt đầu ở `HIDDEN`.
- Người nghỉ việc cần được vô hiệu hóa ngay (`status=TERMINATED`) — xóa sạch ma trận quyền chỉ là biện pháp phụ.

---

# Phần 3. Đóng sổ kế toán (`/admin/closings`)

## 3.1 Hiệu lực của việc đóng sổ

Theo đơn vị tháng (`YYYY-MM`), 4 loại bản ghi sau được gán `lockedAt` + `lockReason="회계 마감 YYYY-MM"`.

| Model | Hành động bị chặn sau khi khóa |
|---|---|
| **Sales** | PATCH (sửa) · Tạo Adjustment |
| **Purchase** | PATCH · Adjustment |
| **Expense** | PATCH · Thay đổi dòng phân bổ |
| **PayableReceivable** | PATCH · Thêm lịch sử thanh toán/liên hệ |

Mọi thay đổi với hàng đã khóa sẽ bị API từ chối với `409 locked`. Trên màn hình, người dùng sẽ thấy thông báo "Tháng đã đóng sổ".

## 3.2 Tác động dữ liệu theo từng giá trị nhập

| Nhập / Hành động | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **Tháng đối tượng** (`YYYY-MM`) | `yearMonth` trong API body — áp dụng cho mọi hàng của 4 model trong khoảng 00:00 đầu tháng đến 00:00 đầu tháng kế tiếp |
| **Nút Đóng sổ** | `POST /api/admin/closings` → gán đồng loạt `lockedAt = bây giờ`, `lockReason = "회계 마감 YYYY-MM"` |
| **Nút Mở khóa** (chỉ ADMIN) | `DELETE /api/admin/closings?yearMonth=` → xóa đồng loạt `lockedAt = null`, `lockReason = null` cho 4 model trong tháng đó |

## 3.3 Quy trình đóng sổ

1. Nhập **Tháng đối tượng (YYYY-MM)** ở đầu màn hình (mặc định: tháng hiện tại).
2. Nút **Đóng sổ (lock)** → modal xác nhận → tiến hành.
3. Hiển thị kết quả: `Khóa hoàn tất: Bán hàng N / Mua hàng N / Chi phí N / PR N` — báo cáo số dòng đã khóa.

## 3.4 Mở khóa (chỉ ADMIN)

Chỉ dùng khi phát hiện sai sót sau khi đã đóng sổ. Nếu quyền là `MANAGER`, nút mở khóa sẽ không hiện.

1. Tại cùng màn hình, nhập tháng đối tượng.
2. Nút **Mở khóa (unlock)** → xác nhận → tiến hành.
3. Hiển thị kết quả: `Mở khóa hoàn tất: Bán hàng N / Mua hàng N / Chi phí N / PR N`.

## 3.5 Những gì tự động xảy ra khi đóng/mở khóa

1. **UPDATE đồng loạt 4 model** — Sales · Purchase · Expense · PayableReceivable.
2. **Mọi PATCH/Adjustment/Amendment đối với hàng đã khóa** đều bị từ chối ở tầng API với `409 locked`.
3. **Đăng ký mới không bị chặn** — vẫn có thể tạo bản ghi bán hàng mới với ngày trong tháng đã khóa (lúc lưu không kiểm tra trạng thái khóa của tháng đó). **Khuyến nghị vận hành**: Sau khi đóng sổ, chỉ tạo mới với ngày của tháng kế tiếp.
4. **Ghi nhật ký kiểm toán** — Cả 4 model đều được ghi action UPDATE (có thể truy vết thay đổi đóng sổ hàng loạt).

## 3.4 Khuyến nghị vận hành

- Lịch đóng sổ hàng tháng nên đặt vào ngày 5 mỗi tháng (cho tháng trước). Đăng ký vào module lịch như một sự kiện định kỳ.
- Trước khi đóng sổ, kiểm tra trước các hạng mục như thu hồi công nợ, đăng ký thanh toán, đối soát tỷ giá.
- Việc mở khóa chỉ giới hạn cho tình huống ngoại lệ, lý do mở khóa cần được ghi chép trong biên bản họp riêng (`/weekly-report`).

---

# Phần 4. Thùng rác (`/admin/trash`)

Khôi phục các hàng đã xóa mềm (`deletedAt != null`). Không cung cấp chức năng xóa vĩnh viễn (để bảo toàn nhật ký kiểm toán).

## 4.1 6 model đối tượng

| Model | Nhãn hiển thị |
|---|---|
| `Client` | Khách hàng/Đối tác |
| `Item` | Mặt hàng |
| `Warehouse` | Kho |
| `Employee` | Nhân viên |
| `Sales` | Bán hàng |
| `Purchase` | Mua hàng |

Mỗi danh mục hiển thị tối đa 100 bản ghi gần nhất.

## 4.2 Hành động khôi phục — Tác động dữ liệu theo từng giá trị nhập

| Nhập / Hành động | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **Nút Khôi phục** | Gọi `POST /api/admin/restore/{model}/{id}` — `model` chỉ chấp nhận 6 loại trong whitelist (Client/Item/Warehouse/Employee/Sales/Purchase) |
| **Hành động API** | Một dòng UPDATE đặt `deletedAt = null` cho hàng đó |
| **Khôi phục các hàng liên quan** | Không tự động khôi phục — khôi phục sales nhưng các dòng sales line cần xử lý riêng (hiện chưa cài đặt, đội IT làm thủ công) |

## 4.3 Quy trình khôi phục

1. Kiểm tra hàng trong thẻ của từng danh mục (Khách hàng/Mặt hàng/...).
2. Nút **Khôi phục** ở bên phải hàng → modal xác nhận → gọi API.
3. Khi thành công, trang tự làm mới. Hàng đó sẽ xuất hiện trở lại trong module bình thường.

## 4.4 Những gì tự động xảy ra khi khôi phục

1. **UPDATE `deletedAt = null`** — chỉ một hàng.
2. **Ghi nhật ký kiểm toán** — action UPDATE, before=`{deletedAt: thời điểm}`, after=`{deletedAt: null}`.
3. **Hiển thị lại trong module** — từ lần load trang tiếp theo sẽ hiện lại trong danh sách bình thường.
4. **Cập nhật ngay vào combobox tự động tìm kiếm** — Xuất hiện lại trong kết quả tìm kiếm của combobox khách hàng và mặt hàng.

## 4.3 Chính sách vận hành

- Thời gian có thể khôi phục là không giới hạn (không hỗ trợ xóa vĩnh viễn). Nếu để nguyên các hàng sai, chúng sẽ tích tụ trong thùng rác.
- Khi khôi phục Bán hàng/Mua hàng, các dòng liên quan và giao dịch tồn kho có thể không tự động được khôi phục cùng — cần liên hệ đội IT trước khi xử lý.
- Khi khôi phục nhân viên, thông tin quyền và đăng nhập cần được rà soát riêng. Trường hợp tái nhập sau khi nghỉ việc, khuyến nghị đăng ký mới.

---

# Phần 5. Nhật ký kiểm toán (`/admin/audit-logs`)

## 5.1 Phạm vi ghi nhận

Toàn bộ INSERT / UPDATE / DELETE của 21 model dữ liệu nghiệp vụ đều được tự động ghi nhận. Được xử lý đồng loạt qua Prisma middleware nên không cần code riêng cho từng module.

## 5.2 Cột bảng

| Cột | Ý nghĩa |
|---|---|
| **Thời điểm** | Thời gian phát sinh (UTC) |
| **Công ty** | `companyCode` của dữ liệu |
| **Người dùng** | username người thay đổi |
| **Hành động** | `INSERT` (xanh lá) · `UPDATE` (vàng) · `DELETE` (đỏ) |
| **Bảng** | Tên bảng DB (ví dụ: `sales`, `inventory_items`) |
| **ID bản ghi** | ID của hàng bị thay đổi |
| **Chi tiết thay đổi** | Khác biệt JSON before / after |

## 5.3 Tìm kiếm · Bộ lọc — Tác động theo từng giá trị nhập

| Nhập | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **Công ty (companyCode)** | URL `?company=` → `WHERE companyCode = X` |
| **Người dùng (userId)** | `?user=` → `WHERE userId = X` |
| **Bảng (tableName)** | `?table=` → `WHERE tableName = X` (ví dụ: `sales`) |
| **Hành động (action)** | `?action=` → một trong INSERT/UPDATE/DELETE |
| **Ngày from/to** | `?from=&to=` → `WHERE occurredAt BETWEEN ...` |

Mọi bộ lọc hoạt động theo điều kiện AND. Giá trị trống bị bỏ qua. Phân trang ở góc trên bên phải bảng — đơn vị 50 bản ghi mỗi trang. Tải Excel cần quyền riêng (do lo ngại về dung lượng lớn).

## 5.4 Kịch bản sử dụng

- **Kiểm tra tính toàn vẹn dữ liệu** — Truy vết những thay đổi giá/số tiền bất thường.
- **Phát hiện hành vi bất thường** — Mẫu hình một người dùng DELETE nhiều bản ghi trong thời gian ngắn.
- **Phản hồi yêu cầu khách hàng** — Trả lời ngay câu hỏi "Ai đã thay đổi và khi nào?".
- **Bằng chứng pháp lý** — Truy vết mọi điều chỉnh phát sinh sau khi đóng sổ kế toán.

---

# Phần 6. Ánh xạ tương thích (`/admin/item-compatibility`)

Đăng ký quan hệ tương thích M:N giữa hàng chính (`PRODUCT`) và vật tư tiêu hao/linh kiện (`CONSUMABLE` / `PART`). Ánh xạ này được dùng làm **bộ lọc tự động trên màn hình yêu cầu vật tư tiêu hao của cổng khách hàng**.

## 6.1 Model đăng ký

| Trường | Ghi chú |
|---|---|
| `productItemId` | Hàng chính (PRODUCT) |
| `consumableItemId` | Vật tư tiêu hao hoặc linh kiện (CONSUMABLE / PART) |

Tổ hợp `(productItemId, consumableItemId)` có ràng buộc unique nên trùng lặp sẽ bị tự động chặn.

## 6.2 Tác động dữ liệu theo từng giá trị nhập

| Nhập / Hành động | **Giá trị này làm gì trong hệ thống** |
|---|---|
| **Chọn hàng chính** (thanh tìm kiếm) | Hiển thị danh sách ánh xạ tương thích hiện tại của `productItemId` đó ở bên phải |
| Nút **+ Thêm** → combobox | itemId được chọn được INSERT làm `consumableItemId` — vi phạm unique `(productItemId, consumableItemId)` sẽ bị tự động bỏ qua |
| Nút **× Xóa** | Chỉ DELETE hàng đó. Hàng chính bị mất ánh xạ sẽ tự động bị loại khỏi tùy chọn "Yêu cầu vật tư tiêu hao" của cổng khách hàng từ lần load trang tiếp theo |

## 6.3 Những gì tự động xảy ra khi đăng ký · xóa

1. **INSERT/DELETE `ItemCompatibility`** — một hàng.
2. **Ghi nhật ký kiểm toán** — action `INSERT` hoặc `DELETE`.
3. **Cổng khách hàng phản ánh tức thì** — `/api/portal/my-supplies` truy vấn trực tiếp mỗi lần nên không liên quan đến cache.
4. **Tự động đề xuất linh kiện trong dispatch nội bộ** — Khi chọn SN của hàng chính trong AS dispatch, các vật tư tiêu hao/linh kiện tương thích sẽ hiển thị ở phần đầu của dropdown ItemCombobox.

## 6.4 Quy trình đăng ký

1. Tìm và chọn hàng chính qua thanh tìm kiếm ở đầu màn hình.
2. Bên phải hiển thị danh sách vật tư tiêu hao/linh kiện tương thích với hàng chính đó.
3. Nút **+ Thêm** → chọn vật tư tiêu hao/linh kiện qua combobox → lưu.
4. Ánh xạ đăng ký sai có thể loại bỏ ngay bằng nút **× Xóa** (được ghi nhật ký kiểm toán).

## 6.3 Tải lên đồng loạt qua Excel

Ánh xạ số lượng lớn được xử lý đồng loạt qua Excel.

| Cột | Định dạng |
|---|---|
| `productItemCode` | Ví dụ: `ITM-260101-001` |
| `consumableItemCode` | Ví dụ: `ITM-260101-005` |

Hàng trống / hàng tiêu đề tự động bị bỏ qua. Hàng trùng lặp chỉ được đăng ký một lần, các hàng còn lại được skip.

## 6.4 Khuyến nghị vận hành

- Khi đăng ký hợp đồng IT mới, đăng ký ánh xạ tương thích đồng thời ngay lập tức — nếu không, yêu cầu vật tư tiêu hao trên cổng khách hàng sẽ bị chặn.
- Với mặt hàng đã ngừng sản xuất, hủy ánh xạ trước rồi mới chuyển master mặt hàng vào thùng rác.
- Thay đổi ánh xạ tương thích được ghi nguyên vào nhật ký kiểm toán nên có thể truy vết trách nhiệm.

---

# Phần 7. Xem chi tiết thống kê (`/stats`)

Màn hình 4 tab vốn chỉ hiển thị "quyền xem" cho nhân viên thông thường (Phần 10 sách A) được quản trị viên sử dụng như công cụ **phân tích, tổng hợp, drill-down**.

## 7.1 Thẻ KPI

Trên cùng dashboard:

| KPI | Công thức |
|---|---|
| **Doanh thu tháng** | Tổng doanh thu tháng hiện tại (theo phạm vi công ty) |
| **Doanh thu cho thuê** | Tiền thanh toán IT/TM + cố định hàng tháng |
| **Thời gian xử lý AS (SLA)** | Thời gian trung bình từ tiếp nhận → COMPLETED |
| **Vòng quay hàng tồn kho** | Xuất kho ÷ Tồn kho trung bình |

## 7.2 Phân tích lợi nhuận tích lũy / TCO theo SN

Drill-down trong `/stats?tab=rental` cho phép xem doanh thu tích lũy / chi phí tích lũy / chi phí linh kiện tích lũy theo đơn vị SN → **lợi nhuận thuần theo SN**.

| Cột | Công thức |
|---|---|
| **Doanh thu tích lũy** | Tổng cộng mọi khoản thanh toán/quyết toán của SN đó |
| **Linh kiện tích lũy** | Tổng cộng giá vốn linh kiện, vật tư tiêu hao đã dùng cho SN đó |
| **Vận chuyển tích lũy** | Tổng phí vận chuyển dispatch liên quan đến SN đó |
| **Lợi nhuận thuần tích lũy** | Doanh thu − (Linh kiện + Vận chuyển + Khấu hao) |

Phân tích này dùng để xác định **thiết bị có lợi nhuận thấp** và phục vụ ra quyết định thu hồi, thay thế, thanh lý.

## 7.3 Hiệu suất theo phòng ban · người phụ trách

`/stats?tab=hr` — Doanh thu theo nhân viên kinh doanh, khối lượng xử lý theo nhân viên AS, phân bổ nhân sự và điểm đánh giá theo phòng ban.

## 7.4 Xuất Excel

Tải dữ liệu raw dưới dạng .xlsx qua nút **Excel** ở góc trên bên phải mỗi biểu đồ. Số liệu được tách theo từng loại tiền tệ, đồng thời bao gồm cả kết quả quy đổi tỷ giá (sang VND).

---

# Phần 8. Vận hành hệ thống

## 8.1 Tổng quan hạ tầng

- **Hosting**: Railway (instance nội bộ + instance cổng khách hàng tách biệt)
- **DB**: PostgreSQL (Railway managed)
- **Triển khai**: GitHub push lên nhánh `main` → tự động build · deploy
- **Lệnh build**: `prisma db push --accept-data-loss && next build`

## 8.2 Cấu trúc 2 instance

| Domain | Biến môi trường | Vai trò có thể truy cập |
|---|---|---|
| `tellustech-admin-production.up.railway.app` | (không có PORTAL_MODE) | ADMIN/MANAGER/EMPLOYEE |
| `portal.tellustech.co.kr` | `PORTAL_MODE=true` | Chỉ CLIENT |

Cùng codebase / cùng DB nhưng routing được phân nhánh theo biến môi trường `PORTAL_MODE`. Chi tiết tham khảo `docs/PORTAL_DEPLOY.md`.

## 8.3 Biến môi trường — Ảnh hưởng hành vi theo từng giá trị

| Khóa | Giá trị / Mục đích | **Giá trị này làm gì trong hệ thống** |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối PostgreSQL | Prisma dùng cho mọi truy vấn DB. 2 instance phải giống nhau để chia sẻ cùng dữ liệu |
| `JWT_SECRET` | Khóa ký token phiên | Phát hành/xác minh JWT. Nếu 2 instance khác nhau, đăng nhập bên này rồi truy cập bên kia sẽ không nhận diện được phiên |
| `ANTHROPIC_API_KEY` | Khóa Claude API | Mọi lần gọi tự động dịch 3 ngôn ngữ. Nếu không cấu hình, chỉ lưu 1 ngôn ngữ gốc (chế độ bỏ qua lỗi) |
| `NODE_ENV` | `production` | Next.js build ở chế độ prod — tối thiểu hóa thông báo lỗi, kích hoạt cache tĩnh |
| `PORTAL_MODE` | Chỉ instance cổng đặt `true` | proxy chặn toàn bộ route không phải cổng (`/admin/*`, `/master/*`...). Phiên không phải CLIENT bị từ chối tự động |

> **Cấm**: Đừng commit `.env` vào git (đã đăng ký trong `.gitignore`). Khi xoay vòng secret, cập nhật đồng thời 2 instance.

## 8.4 Sao lưu · Phục hồi

- **Sao lưu tự động**: Sao lưu hàng ngày tự động của Railway (thời gian lưu giữ 7 ngày — tùy gói).
- **Phục hồi theo thời điểm**: Railway Dashboard → Database → Backups → Chọn thời điểm → Restore.
- **Sao lưu thủ công**: Export định kỳ bằng `pg_dump` (khuyến nghị 1 lần/tháng). Sản phẩm export lưu vào kho lưu trữ an toàn nội bộ công ty.

## 8.5 Triển khai · Rollback

| Hành động | Cách thực hiện |
|---|---|
| **Triển khai** | Push lên nhánh `main` hoặc merge PR → tự động build |
| **Rollback** | Railway Dashboard → Deployments → Chọn build cũ → Redeploy |
| **Dừng instance** | Chỉ dừng một instance (ví dụ: bảo trì cổng) → instance còn lại không bị ảnh hưởng |

## 8.6 Giám sát

- Xem log thời gian thực ở tab **Logs** của Railway Dashboard.
- Cảnh báo: cấu hình ở Railway → Settings → Notifications để gửi email · Slack khi triển khai thất bại · crash.
- Chỉ số giám sát khuyến nghị: Thời gian phản hồi p95, tỷ lệ lỗi, tỷ lệ sử dụng connection pool DB.

---

# Phần 9. Phụ lục

## 9.1 Bảng mã tự động (toàn bộ)

| Đối tượng | Định dạng | Ghi chú |
|---|---|---|
| Khách hàng | `CL-YYMMDD-###` | Số thứ tự theo ngày |
| Hàng hóa   | `ITM-YYMMDD-###` | Số thứ tự theo ngày |
| **Nhân viên** | **`TNV-###` (TV) / `VNV-###` (VR)** | **Số thứ tự theo công ty, không bao gồm YYMMDD** |
| Hợp đồng IT | `TLS-YYMMDD-###` / `VRT-YYMMDD-###` | Tiền tố theo công ty |
| Cho thuê TM | `TM-YYMMDD-###` | |
| Phiếu AS | `YY/MM/DD-##` | Phân tách bằng dấu gạch chéo |
| Bán hàng   | `SLS-YYMMDD-###` | |
| Mua hàng   | `PUR-YYMMDD-###` | |
| Đánh giá   | `INC-YYMMDD-###` (sự cố) / `EVAL-YYMMDD-###` (định kỳ) | |
| Vào/Nghỉ việc | `ONB-YYMMDD-###` / `OFF-YYMMDD-###` | |
| Phép năm   | `LV-YYMMDD-###` | |
| Chi phí   | `EXP-YYMMDD-###` | |
| Lịch trình   | `SCH-YYMMDD-###` | |
| Giấy phép | `LIC-YYMMDD-###` | |

Chuỗi mã tự động được lưu trong bảng `code_sequences` theo công ty và theo ngày.

## 9.2 Chính sách mã công ty

- Chỉ tồn tại 2 mã: `TV` (Tellustech Vina) / `VR` (Vietrental).
- Tất cả các bảng nghiệp vụ đều bắt buộc có `company_code`, được ràng buộc bằng index.
- Master dùng chung (`clients`, `items`, `warehouses`) không có mã công ty — TV/VR dùng chung dữ liệu.
- Khi ADMIN/MANAGER xem tổng hợp, dùng giá trị ảo `companyCode='ALL'` để tự động thêm mệnh đề IN vào mọi truy vấn.

## 9.3 S/N - khóa chuẩn tích hợp

- S/N là cầu nối giữa các module. Khi thiết kế phải đảm bảo có thể join được bằng S/N.
- **Chính sách kiểm tra tồn kho**:
  - **STRICT** — Khi đăng ký cho thuê IT. Chỉ cho phép khi SN có trong kho của công ty.
  - **LOOSE** — Cho thuê TM / Hiệu chuẩn / AS / Bán hàng / Mua hàng. Cho phép hàng bên ngoài hoặc khách hàng cấp (chỉ cảnh báo).
- Master SN: `InventoryItem` (tồn kho theo đơn vị S/N + trạng thái + QR + lịch sử).
- API tìm kiếm SN: `GET /api/inventory/sn/search?q=` (tự động giới hạn theo công ty, tùy chọn `itemId`, `inStock`).

## 9.4 Tự động dịch 3 ngôn ngữ

- Trường mô tả tự do gồm 3 cột `*_vi/_en/_ko` + `original_lang`.
- Khi lưu, Claude API (`ANTHROPIC_API_KEY`) tự động dịch sang 2 ngôn ngữ còn lại.
- Phạm vi áp dụng: triệu chứng/nội dung AS, đánh giá sự cố, ghi chú, chat, biên bản họp, lịch sử liên hệ PR, lý do nghỉ phép, tên phòng ban·tên khách hàng·tên nhân viên, v.v.
- **Chỉ quản trị viên mới có thể chỉnh sửa bản dịch** — người dùng thường chỉ chỉnh sửa được bản gốc.
- Khi dịch thất bại (lỗi API, v.v.) thì chỉ lưu 1 ngôn ngữ gốc, hiển thị trên màn hình người dùng qua nút 「Xem bản gốc」.

## 9.5 Chữ ký (Signature)

- Hỗ trợ ký bằng ngón tay trên di động (HTML5 canvas).
- Component: `SignatureCanvas` (inline) / `SignatureModal` (popup).
- Định dạng lưu: PNG data URL (`data:image/png;base64,...`).
- Vị trí áp dụng: Xác nhận sử dụng trên cổng khách hàng, hoàn thành dispatch AS.
- Sau khi ký, dòng tương ứng sẽ bị khóa — muốn sửa phải nhận chữ ký mới.

## 9.6 Hướng dẫn nhanh xử lý sự cố

| Triệu chứng | Kiểm tra trước tiên |
|---|---|
| Màn hình 「Không có quyền」 | Ma trận UserPermission — module đó có đang `HIDDEN` không? |
| Thông báo 「Dữ liệu ngoài công ty」 | Picker công ty trên sidebar có phải `ALL` hoặc đúng công ty không? |
| 「Tháng đã đóng sổ」 | Mở khóa tại Đóng sổ kế toán (`/admin/closings`) rồi thử lại — cẩn trọng |
| API 500 lặp lại | Kiểm tra Railway Logs, kiểm tra số dư ANTHROPIC_API_KEY |
| Menu sidebar biến mất | Cần làm mới sau khi thay đổi ma trận quyền |
| Tự động dịch chỉ lưu 1 ngôn ngữ | Kiểm tra ANTHROPIC_API_KEY, có khả năng Claude API hết thời gian phản hồi |

---

# Phần 10. Quản lý mở rộng cổng (NEW — Phase A/B/C/D)

5 module mới mở rộng cổng khách hàng từ công cụ AS đơn thuần thành **kênh giữ chân khách hàng + marketing**. Tất cả đều được thêm vào nhóm 「Quản lý」 trên sidebar.

## 10.1 Menu bổ sung trên sidebar

| Đường dẫn | Màn hình | Chức năng |
|---|---|---|
| `/admin/portal-points` | 🏆 Quản lý điểm cổng | 4 tab: Cài đơn giá / Cấp thủ công / Duyệt đổi / Lịch sử |
| `/admin/portal-banners` | 📣 Quản lý banner cổng | Quảng cáo một dòng theo slot OA/TM + URL liên kết |
| `/admin/quotes` | 💬 Quản lý yêu cầu báo giá | Phân công báo giá + Gửi + Chuyển sang hợp đồng |
| `/admin/feedback` | 🌟 Quản lý ý kiến khách hàng | Trả lời khen ngợi/cải tiến/đề xuất (tự động dịch 3 ngôn ngữ) |
| `/admin/portal-posts` | 📰 Quản lý bài đăng cổng | CMS 7 chuyên mục + Tạo bản nháp AI + Bật/tắt phát hành |
| `/admin/surveys` | 📊 Quản lý khảo sát | Tạo câu hỏi RATING/CHOICE/TEXT + Tổng hợp kết quả |
| `/admin/referrals` | 🤝 Quản lý giới thiệu | 5 trạng thái + Kích hoạt 100,000d khi nhận khoản thanh toán đầu tiên |

## 10.2 Quản lý điểm cổng (`/admin/portal-points`)

### Tab 0: Chính sách theo khách hàng + Tài khoản cổng (NEW — quan trọng nhất)

Tab này là **bảng điều khiển vận hành cổng tích hợp** — cấp ID cổng/quản lý mật khẩu + chính sách sử dụng điểm tại một nơi.

#### Cột bảng

| Cột | Ý nghĩa | Hành động |
|---|---|---|
| Mã | clientCode | — |
| Tên khách hàng | Hiển thị ưu tiên KO | — |
| **ID cổng** | username đã cấp, gạch ngang khi vô hiệu, hiển thị ⚠ khi chưa cấp | (cột hành động bên dưới) |
| Số dư điểm | SUM(PortalPoint.amount) — theo đơn vị khách hàng | — |
| Chính sách sử dụng | NONE / INVOICE_DEDUCT_ONLY / GIFT_CARD_ONLY / BOTH | select áp dụng tức thì |
| **Hành động tài khoản** | [+ Cấp ID] / [🔑 Đặt lại mật khẩu] / [Bật/tắt kích hoạt] | (quy trình bên dưới) |

#### Cấp ID cổng (thực hiện ngay sau khi đăng ký khách hàng mới)

1. Nhấp **[+ Cấp ID]** ở khách hàng đang hiển thị 「⚠ Chưa cấp」
2. Prompt 1: Nhập **ID cổng** (để trống thì tự động tạo — `clientcode_portal`, ví dụ: `cl-260101-001_portal`)
3. Prompt 2: Nhập **mật khẩu ban đầu** (để trống thì tự động tạo ngẫu nhiên 10 ký tự)
4. Khi cấp thành công, alert hiển thị **ID + mật khẩu tạm**
5. **⚠ Mật khẩu sẽ không hiển thị lại** — sao chép ngay và chuyển cho người phụ trách IT của khách hàng

#### Đặt lại mật khẩu (mất / thay đổi định kỳ)

1. Nhấp nút **[🔑 Đặt lại mật khẩu]** của khách hàng đã cấp
2. Hộp thoại xác nhận — cảnh báo "Mật khẩu cũ vô hiệu ngay lập tức" → xác nhận
3. Prompt: Nhập mật khẩu mới (để trống thì tự động tạo)
4. Sau khi đặt lại, alert hiển thị mật khẩu mới → chuyển ngay cho khách hàng

#### Bật/tắt kích hoạt

- **Vô hiệu hóa**: Tạm dừng (tranh chấp hợp đồng, chưa thanh toán, v.v.). Khi người dùng cố đăng nhập sẽ bị từ chối ngay. Điểm đã tích lũy được bảo toàn.
- **Kích hoạt**: Có thể sử dụng lại.
- Xóa vĩnh viễn chỉ dành cho ADMIN + DELETE API (khi xung đột lịch sử điểm thì khuyến nghị vô hiệu hóa).

#### Quyết định chính sách sử dụng điểm

**Chính sách sử dụng điểm theo từng khách hàng được quyết định tại thời điểm ký hợp đồng.** Cần thiết lập cẩn trọng để đáp ứng compliance của tập đoàn lớn (cấm nhận phiếu quà tặng cá nhân, v.v.).

| Chính sách | Ý nghĩa | Trường hợp áp dụng |
|---|---|---|
| **NONE** | Chỉ tích lũy được, không đổi được (mặc định) | Khách hàng mới — trước khi quyết định chính sách |
| **INVOICE_DEDUCT_ONLY** | Chỉ trừ vào hóa đơn | Tập đoàn lớn (Samsung/LG/Hyundai, v.v.) — chặn nhận cá nhân |
| **GIFT_CARD_ONLY** | Chỉ nhận được phiếu quà tặng | SME·SOHO — trường hợp hóa đơn ít, khó trừ |
| **BOTH** | Có thể chọn cả hai | Khách hàng thông thường |

Thay đổi select áp dụng vào DB tức thì. Áp dụng từ lần đăng nhập tiếp theo của khách hàng.

#### Kiểm tra

- Khi khách hàng đăng ký đổi với tùy chọn vi phạm chính sách → API `400 policy_violation` từ chối
- Khách hàng có chính sách = NONE → bản thân nút đổi bị vô hiệu hóa + thông báo "Quản trị viên chưa cài đặt"
- Số dư không liên quan đến chính sách — tích lũy luôn hoạt động

### Tab 1: Cài đơn giá (chỉ ADMIN mới sửa được)

Đơn giá tích lũy theo 15 lý do (`PointReason` enum):

| Lý do | Mặc định | Khi vô hiệu |
|---|---|---|
| `AS_REQUEST` | 1,000 | Đăng ký AS không tích lũy |
| `SUPPLIES_REQUEST` | 1,000 | |
| `SERVICE_CONFIRM` | 1,000 | |
| `USAGE_CONFIRM` | 1,000 | |
| `QUOTE_REQUEST` | 1,000 | |
| `FEEDBACK_PRAISE/IMPROVE/SUGGEST` | Mỗi loại 1,000 | |
| `SURVEY_COMPLETE` | 10,000 | (Có thể chỉ định riêng cho mỗi khảo sát) |
| `POST_WRITE` | 1,000 | Viết bài cộng đồng |
| `POST_READ_BONUS` | 0 (chỉ định theo từng bài) | |
| `REFERRAL_CONTRACT` | 100,000 | Tại thời điểm thanh toán đầu tiên |
| `ADMIN_GRANT/DEDUCT` | 0 (thủ công) | — |
| `REWARD_EXCHANGE` | — (tự động trừ) | — |

### Tab 2: Cấp/trừ thủ công

Chọn khách hàng + số tiền (dương=cấp, âm=trừ) + lý do → áp dụng vào số dư tức thì. Sử dụng cho sự kiện marketing, thưởng, hoàn tiền.

### Tab 3: Duyệt đổi

Danh sách `PortalReward(PENDING)` mà khách hàng đã đăng ký.
- **[Duyệt]** → `APPROVED` (tiến hành xử lý thực tế)
- **[Từ chối]** → `REJECTED` + Tự động hoàn lại điểm đã trừ
- **[Đã giao]** → `DELIVERED`
  - Khi INVOICE_DEDUCT: Nhập ID PayableReceivable cần áp dụng trừ
  - Khi GIFT_CARD: Nhập thông tin gửi (số gifticon·tin nhắn, v.v.)

### Tab 4: Lịch sử toàn bộ

Tìm kiếm·lọc tất cả tích lũy/trừ (khách hàng/lý do/thời kỳ) + Tải xuống Excel (Phase tiếp theo).

## 10.3 Banner cổng (`/admin/portal-banners`)

Văn bản quảng cáo một dòng theo slot OA/TM + URL liên kết.

```
Slot: OA
KO: 프린터 걱정 없는 올인원 렌탈
VI: Cho thuê máy in trọn gói
EN: All-in-one printer rental
URL: https://tellustech.co.kr/oa
[Lưu]
```

Sau khi lưu sẽ áp dụng vào tất cả cổng khách hàng ngay lập tức. Văn bản phù hợp với ngôn ngữ người dùng sẽ hiển thị dưới header lĩnh vực kinh doanh trên sidebar.

## 10.4 Quản lý báo giá (`/admin/quotes`)

### Quy trình lập báo giá

1. Khách hàng yêu cầu tại `/portal/quotes` → `status = REQUESTED`, cấp `QR-YYMMDD-###`
2. Tự động phân công nhân viên kinh doanh (Phase tiếp theo) hoặc quản trị viên phân công thủ công
3. Quản trị viên nhấp [Lập báo giá] → Nhập số tiền + ghi chú (đính kèm PDF là Phase tiếp theo)
4. → Chuyển sang `status = QUOTED`, kích hoạt [Chấp nhận]/[Từ chối] trên màn hình khách hàng
5. Khách hàng chấp nhận → `ACCEPTED` → Chuyển sang form Hợp đồng IT/Cho thuê TM/Bán hàng (Phase tiếp theo)

### Chính sách từ chối·hết hạn báo giá

- Từ chối (`REJECTED`): Báo giá bị khách hàng từ chối
- Hết hạn (`EXPIRED`): Đến thời điểm hết hạn tự động (hiện chưa triển khai hết hạn tự động — quản trị viên đổi thủ công)

## 10.5 Quản lý ý kiến (`/admin/feedback`)

Danh sách ý kiến theo loại (`PRAISE / IMPROVE / SUGGEST`) + Soạn trả lời.

### Soạn trả lời

- Chỉ cần nhập tiếng Hàn một ô, Claude API sẽ tự động dịch sang VI/EN
- Khi lưu, `status = REPLIED`, hộp trả lời được hiển thị thêm trên màn hình khách hàng
- Sau khi trả lời vẫn có thể trả lời thêm (ghi đè)

### Liên kết khen ngợi → đánh giá nhân sự (Phase tiếp theo)

Khi nhấp vào ý kiến khen ngợi sẽ hiển thị nút [Liên kết đánh giá nhân sự] để tự động tạo `Incident(COMMENDATION)` — có thể dùng làm tài liệu cộng điểm khi đánh giá nhân viên (hiện liên kết thủ công).

## 10.6 Quản lý bài đăng (`/admin/portal-posts`)

### Danh sách dạng thẻ

- Tab trạng thái: Toàn bộ / 📝 Bản nháp / ✅ Đã phát hành (tự động đếm số lượng)
- Sắp xếp: Mới nhất (createdAt desc)
- Nhấp vào thẻ → **Modal chỉnh sửa** (Tiêu đề 3 ngôn ngữ, Nội dung tab KO/VI/EN, Chuyên mục, Phát hành, Ghim, Điểm thưởng)

### Tạo bản nháp AI

Thẻ 「🤖 Tạo bản nháp AI」 ở phía trên:
- Select chuyên mục (7 loại)
- Nhập text chủ đề (ví dụ: "Hướng dẫn ngày lễ Việt Nam tháng 5/2026")
- Nút [🤖 Tạo bản nháp AI]

Hoạt động bên trong:
1. Gọi Claude haiku-4.5 (system + assistant prefill ép định dạng JSON)
2. Áp dụng hướng dẫn strict theo chuyên mục (`mustBe / mustNot / tone`) — chặn nội dung không liên quan như TIP trong tab marketing
3. Kích hoạt công cụ `web_search_20250305` — tự động tìm kiếm khi cần sự thật bên ngoài
4. Phân tích phản hồi → Mảng tiêu đề·nội dung·sources tiếng Hàn
5. Tự động dịch VI/EN bằng fillTranslations
6. Đính kèm footer tự động ở cuối nội dung:
   ```
   ---
   Nguồn:
   - https://...
   - https://...

   ※ Bản nháp do AI tự động tạo — Cần kiểm tra sự thật trước khi phát hành
   ```
7. Lưu với `isPublished=false`, `isAiGenerated=true`
8. Tự động chuyển sang tab 「Bản nháp」 + Tự động mở modal bài vừa tạo → Phát hành sau khi xem xét

### 🧹 Công cụ dọn dẹp AI

Các bài được tạo trước khi sửa prefill có thể chứa nguyên text reasoning + khối ```json``` trong nội dung.
- Tự động hiển thị viền đỏ + huy hiệu ⚠ Cần dọn dẹp trên thẻ
- Nhấp nút [🧹 Dọn dẹp AI] → Trích xuất JSON từ nội dung → Thay title/body sạch sẽ → Đính kèm footer → Dịch lại VI/EN
- Trường hợp không có JSON, tự động xóa preamble reasoning rồi sử dụng nguyên trạng
- Nếu tất cả thất bại, hướng dẫn `[Xóa] rồi tạo lại`

### Chính sách strict theo chuyên mục

| Chuyên mục | mustBe (bắt buộc) | mustNot (cấm) |
|---|---|---|
| MARKETING | Bao gồm câu CTA về khuyến mãi·sự kiện·sản phẩm mới | Mẹo sử dụng, đời sống công ty, tóm tắt tin tức |
| COMPANY_NEWS | Nhân sự·tổ chức·văn phòng mới·giải thưởng | Tin tức bên ngoài, marketing, mẹo sử dụng |
| KOREA_NEWS | Tin tức kinh doanh/kinh tế Hàn Quốc·người Hàn | Marketing Tellustech, mẹo sử dụng |
| VIETNAM_NEWS | Chính sách·ngày lễ·ngành công nghiệp Việt Nam | Tin tức Hàn Quốc, marketing Tellustech |
| INDUSTRY_NEWS | Thị trường OA/Thiết bị đo·sản phẩm mới·công nghệ | Marketing Tellustech, mẹo sử dụng |
| TIP | Hướng dẫn sử dụng·bảo trì·xử lý sự cố | Marketing, tin tức bên ngoài, thông báo công ty |
| COMMUNITY | Chia sẻ thông tin giữa khách hàng | Thông báo chính thức, marketing, mẹo kỹ thuật |

## 10.7 Quản lý khảo sát (`/admin/surveys`)

### Tạo khảo sát

| Trường | Ý nghĩa |
|---|---|
| Tiêu đề (KO/VI/EN) | Tự động dịch |
| Ngày bắt đầu / Ngày kết thúc | Chỉ hiển thị cho khách hàng trong khoảng này |
| Điểm thưởng | Tích lũy khi hoàn thành phản hồi (mặc định 10,000d) |
| N câu hỏi | RATING (1~5) / CHOICE (chọn đơn) / TEXT (mô tả tự do) |

### Tổng hợp kết quả (Phase tiếp theo)

- RATING: Điểm trung bình + Biểu đồ phân bố
- CHOICE: Biểu đồ tròn theo lựa chọn
- TEXT: Phân tích tóm tắt mô tả tự do bằng Claude API

## 10.8 Quản lý giới thiệu (`/admin/referrals`)

### Tiến trình 5 trạng thái

| Giai đoạn | Hành động | Kích hoạt tự động |
|---|---|---|
| SUBMITTED | Khách hàng đăng ký | Tự động phân công nhân viên kinh doanh (Phase tiếp theo) |
| CONTACTED | Đã liên hệ lần đầu | Quản trị viên thay đổi |
| MEETING | Đang họp kinh doanh | Quản trị viên thay đổi |
| CONTRACTED | Đã ký hợp đồng (trước khi thanh toán) | Quản trị viên thay đổi |
| **PAID** | **Phát sinh khoản thanh toán đầu tiên** | Nút [Thanh toán đầu tiên] → **Tự động tích lũy +100,000d + ghi `firstPaymentAt` + lưu `contractPointId`** |
| DECLINED | Từ chối·thất bại | Quản trị viên thay đổi |

> **Chặn tự giới thiệu**: Khi đăng ký giới thiệu, nếu `companyName` trùng với `companyNameVi` của khách hàng đó thì trả về `400 self_referral`.

### Trigger thanh toán đầu tiên (chống trùng lặp)

Khi chuyển sang trạng thái `PAID`:
- `Referral.firstPaymentAt = bây giờ`
- `Referral.contractPointId = id PortalPoint do grantPoints tạo`
- Nếu cố chuyển cùng một giới thiệu sang PAID lần nữa thì từ chối với `already_paid`

## 10.9 Khuyến nghị vận hành

### Phòng ngừa lạm phát điểm

- Thay đổi cài đơn giá phải cẩn trọng — Điểm đã tích lũy vẫn giữ nguyên
- Chính sách hết hạn: Ngoài phạm vi Phase A (cần quyết định riêng — sau khi xem xét luật bảo vệ người tiêu dùng Việt Nam)
- Theo dõi tỷ lệ tích lũy vs sử dụng: Hàng tháng kiểm tra xu hướng tổng hợp tại tab 4 「Lịch sử」

### Kiểm tra bài đăng AI

- Bản nháp AI luôn được tạo với `isPublished=false` — Bật phát hành sau khi xem xét
- Sự thật bên ngoài (ngày lễ Việt Nam·kinh tế Hàn Quốc, v.v.) cần nhấp URL nguồn web_search để xác nhận
- Bài MARKETING không gọi web_search → mảng sources rỗng là bình thường

### Phòng chống gian lận giới thiệu

- Khi cùng tên công ty·số điện thoại được đăng ký giới thiệu trùng lặp thì xem xét thủ công
- Trigger thanh toán đầu tiên chỉ hoạt động 1 lần cho mỗi giới thiệu — Tái thanh toán/hợp đồng bổ sung không thưởng riêng

---

# Phần 11. Hướng dẫn vận hành Mobile (NEW)

## 11.1 Lưu ý khi thay đổi PWA manifest

Sau khi thay đổi `public/manifest.webmanifest`, để người dùng nhận được cập nhật ngay lập tức:
1. Bump tên cache của service worker (`tts-portal-v2` → `v3`)
2. Loại manifest khỏi mảng `ASSETS`
3. Trong fetch handler, manifest luôn ưu tiên network

Sau khi triển khai, sự kiện `controllerchange` sẽ tự động làm mới → người dùng không cần xóa cache thủ công, áp dụng ngay tức thì.

## 11.2 Người dùng đã cài PWA (đã thêm vào màn hình chính)

Đối với iOS Safari, manifest được cache ở cấp OS tại thời điểm cài đặt. Nếu thay đổi các giá trị như orientation:
- Hướng dẫn người dùng "Xóa icon trên màn hình chính → Truy cập lại bằng Safari → Thêm lại vào màn hình chính"
- Android Chrome tự động làm mới SW nên áp dụng ngay tức thì

## 11.3 Mở khóa xoay màn hình

Gọi `screen.orientation.unlock()` — giải phóng khóa còn sót lại trên Chrome/Edge. iOS Safari không hỗ trợ nhưng nếu manifest đúng thì OS sẽ tự cho phép xoay.

---

# Phần 12. Tự động thu thập SNMP counter + Phiếu xác nhận sử dụng

Một chương trình nhỏ (= agent) được cài trên PC khách hàng sẽ tự động đọc counter in của máy đa năng/máy in và gửi về ERP, hàng tháng giá trị đó sẽ được dùng để tạo **Phiếu xác nhận sử dụng** (PDF cho khách hàng ký) → Phiếu doanh thu, tất cả trong một luồng. Phần này là **quy trình tại hiện trường mà bất kỳ ai cũng có thể làm theo**.

## 12.0 Tóm tắt một trang — Cần làm gì với khách hàng mới triển khai lần đầu

```
[Quản trị viên]              [Quản trị viên/Kinh doanh]   [PC khách hàng]
1) Đăng ký Model OID ─┐
                      └──→ 2) Đăng ký hợp đồng·thiết bị·nhập tính phí ──→ 3) Phát hành token
                                                          ↓
                                              4) Tải gói agent (ZIP)
                                                          ↓
                                                    5) Chuyển qua USB → install.bat
                                                          ↓
                                              6) Xác nhận thu thập đầu tiên (Tình hình thu thập)
                                                          ↓
[Quản trị viên]
7) Hàng tháng: Tự động tạo phiếu xác nhận sử dụng → Thông báo khách hàng → Ký → PDF → Phiếu doanh thu
```

## 12.1 Màn hình quản lý SNMP (`/admin/snmp`)

Truy cập màn hình: Sidebar → nhóm **Rental** → **Quản lý SNMP**.

Gồm ba tab.

### Tab 1 — Quản lý Model OID

Định nghĩa **counter sẽ được đọc bằng OID nào** cho từng model máy đa năng/máy in. Nhiều máy cùng model chỉ đăng ký một lần.

6 loại đã được seed sẵn (sử dụng nguyên trạng):

| deviceModel | Ghi chú |
|---|---|
| `SAMSUNG_SCX8123` · `SAMSUNG_X7500` | OID chuẩn cho máy đa năng màu Samsung |
| `SINDOH_D330` · `SINDOH_D410` · `SINDOH_D320` | Sindoh đen trắng/màu |
| `GENERIC_PRINTER` | Chỉ dùng OID chuẩn RFC 3805 (fallback khi chưa rõ thương hiệu) |

#### Thêm model mới — Theo từng bước

1. Nhấn nút **[+ Thêm model]**.
2. Nhập theo bảng sau:

| Trường | Ví dụ | Cách tìm |
|---|---|---|
| `deviceModel` | `BROTHER_HL5470` | Chữ in hoa + dấu gạch dưới. Gộp nhiều máy cùng model thành một key |
| `brand` | `BROTHER` | Hiển thị |
| `modelName` | `HL-5470DW` | Hiển thị |
| `oidTotal` | `1.3.6.1.2.1.43.10.2.1.4.1.1` | **Chuẩn RFC 3805** — 90% máy in trả về tổng counter qua OID này. Lúc đầu cứ dùng nguyên giá trị này. |
| `oidBw` | (tùy chọn) | Counter đen trắng riêng. OID riêng — Tham khảo manual nhà sản xuất / tìm web (ví dụ: "Samsung X7500 SNMP OID BW counter") |
| `oidColor` | (tùy chọn) | Counter màu. Chỉ cho model màu |
| `oidSerial` | `1.3.6.1.2.1.43.5.1.1.17.1` | OID S/N chuẩn. Dùng khi tự động dò |
| `isMonoOnly` | ☑ / ☐ | Tích nếu chỉ đen trắng → bỏ qua OID màu |

3. **[Lưu]**. Áp dụng ngay — sẽ xuất hiện trong dropdown khi đăng ký thiết bị mới.

#### Cách kiểm tra OID model mới (tùy chọn, IT team)

> Chỉ cần kiểm tra một máy đầu tiên.

1. Kết nối 1 máy của model đó vào LAN với một IP bất kỳ.
2. Trên một PC bất kỳ, mở PowerShell:
   ```
   snmpwalk -v2c -c public <IP máy in> 1.3.6.1.2.1.43.10.2.1.4.1.1
   ```
   Nếu trả về số thì OID ổn. Nếu không có phản hồi thì SNMP đang tắt hoặc community khác — vào web UI máy in bật SNMP v2c, community=`public`.
3. Nhập OID phản hồi vào trường `oidTotal` của bảng trên.

### Tab 2 — Tình hình thu thập

Hiển thị 500 bản ghi `SnmpReading` mới nhất theo thứ tự thời gian giảm dần.

| Cột | Ý nghĩa |
|---|---|
| Thời điểm thu thập | Thời điểm agent gửi đến ERP (UTC → hiển thị KST) |
| Hợp đồng / S/N / Model | Dữ liệu của thiết bị nào |
| Tổng / Đen trắng / Màu | Counter tích lũy (raw, không phải delta) |
| Phương thức | `AGENT` (tự động) / `MANUAL` (quản trị viên nhập tay) |
| Badge | Bình thường / **⚠ Reset** (phát hiện delta âm) |

#### Khi xuất hiện badge "⚠ Reset" thì làm gì

1. Vào chi tiết hợp đồng IT của thiết bị → tab Thiết bị → **[Sửa]**.
2. Nhập ngày xảy ra reset vào trường **`resetAt`** (ví dụ: ngày thay mainboard, hoặc đúng ngày thu thập).
3. Lưu → Từ lần tính sử dụng tiếp theo, chỉ dùng counter sau thời điểm đó (bỏ qua giá trị trước).
4. Nếu không phải thay mainboard mà chỉ là lỗi counter, **nhập SnmpReading thủ công** để bổ sung giá trị hiệu chỉnh.

### Tab 3 — Token thiết bị

Bảng được nhóm theo từng hợp đồng IT ACTIVE — mỗi thiết bị một dòng.

| Cột | Ý nghĩa / Hành động |
|---|---|
| Thiết bị (S/N · Model) | Thông tin ItContractEquipment |
| Trạng thái token | `Không có` / `Hợp lệ (hết hạn D-N)` / `Hết hạn` / `Đã hủy` |
| Lần thu thập cuối | `lastReadingAt` (nếu không có thì "—") |
| Hành động | **[🔑 Phát hành]** / **[Hủy]** / **[📦 Tải gói agent]** |

#### Chính sách token

- **Token thiết bị** (`tok_*`) — Mỗi máy một token. Agent dùng khi gửi SNMP counter.
- **Token hợp đồng** (`ctr_*`) — Mỗi hợp đồng 1 cái. Agent dùng khi đề nghị đăng ký thiết bị mới phát hiện.
- **TTL 60 ngày** — Gia hạn trượt mỗi lần kết nối (tự động kéo dài). Tự hết hạn nếu không kết nối 60 ngày.
- **Hủy** — Vô hiệu ngay (ghi `revokedAt` vào DB). Agent đó sẽ bị từ chối `401` từ lần gửi tiếp theo. Dùng khi **mất/nghỉ việc/kết thúc hợp đồng**.

#### Nút [🔑 Phát hành]

- Chưa phát hành hoặc đã hết hạn → Phát hành ngay UUID mới. Hiển thị trên màn hình 1 lần rồi không thấy lại (chỉ giữ trong DB).
- Nếu đã có token hợp lệ thì nút đổi thành [Phát hành lại], token cũ bị hủy + phát hành token mới.

### [📦 Tải gói agent]

Nút này là **điểm khởi đầu của việc cài đặt tại hiện trường**. Khi nhấn, luồng như sau:

1. ERP tạo file `config-{contractCode}.json` — bao gồm token hợp đồng + N token thiết bị + URL ERP.
2. Trình duyệt tải xuống.
3. Quản trị viên gói file vừa nhận + (đang giữ riêng) `tellustech-agent.exe` + `install.bat` + `uninstall.bat` + `README.txt` **vào ZIP** rồi sao chép vào USB.

> Bảo mật: Token trong `config-*.json` ở dạng plain text — Nếu mất USB, ngay lập tức vào sidebar → SNMP → [Hủy] hợp đồng đó rồi [Phát hành lại].

---

## 12.2 Quy trình triển khai khách hàng mới — Hướng dẫn từng bước

### Step 1. Đăng ký hợp đồng·thiết bị (Kinh doanh / Quản trị viên)

1. Sidebar → **Rental** → **Hợp đồng IT** → **[+ Mới]** → Đăng ký hợp đồng (tự động phát hành TLS-/VRT-YYMMDD-###).
2. Chi tiết hợp đồng → tab **Danh sách thiết bị** → **[+ Thêm thiết bị]**.
3. Các trường sau là **bắt buộc cho việc tự động thu thập SNMP**:

| Trường | Ý nghĩa | Ví dụ nhập |
|---|---|---|
| Mặt hàng (ItemCombobox) | Thân máy đã đăng ký trong tồn kho công ty | "Samsung X7500" |
| **S/N** | S/N chính xác của tồn kho công ty | `SN-X7500-001` |
| Nhà sản xuất | Text tự do | "SAMSUNG" |
| **deviceModel** (dropdown) | Key của Model OID ở 12.1 | `SAMSUNG_X7500` |
| **deviceIp** | Được điền tự động khi quét — **có thể để trống** | (DHCP) |
| **snmpCommunity** | Mặc định `public` | Thay đổi nếu chính sách công ty yêu cầu |
| **installCounterBw / installCounterColor** | Counter tại thời điểm cài đặt | 0 (mới) / 12,345 (đã qua sử dụng) |
| **baseIncludedBw / Color** | Số trang cơ bản bao gồm hàng tháng | 5,000 / 1,000 |
| **extraRateBw / Color** | Đơn giá vượt mức (₫/trang) | 30 / 200 |

> Nếu `deviceIp` để trống thì agent sẽ **quét LAN khi chạy lần đầu** để tự động phát hiện và cập nhật DB.

### Step 2. Phát hành token (Quản trị viên)

1. Sidebar → **Rental** → **Quản lý SNMP** → tab 3.
2. Mở rộng hợp đồng đã đăng ký, nhấn **[🔑 Phát hành]** ở từng dòng thiết bị.
3. Xác nhận đã phát hành token cho tất cả thiết bị.

### Step 3. Tạo gói agent (Quản trị viên, PC trụ sở)

1. Tại cùng màn hình [📦 **Tải gói agent**] → Lưu `config-{contractCode}.json`.
2. Tập hợp các file master được lưu giữ trên PC trụ sở vào USB hoặc thư mục tạm:
   - `tellustech-agent.exe` (tải bản mới nhất từ [GitHub Releases](https://github.com/jslee-sketch/tellustech-admin/releases))
   - `config-{contractCode}.json` vừa nhận → Đổi tên file thành **`config.json`**
   - `installer/install.bat`
   - `installer/uninstall.bat`
   - `installer/README.txt`
3. **Gói 5 file trên thành 1 ZIP** → Tên file: `tellustech-agent-{tên khách hàng}.zip`.

### Step 4. Cài đặt PC khách hàng (Đến tận nơi / Hướng dẫn từ xa)

#### Kiểm tra trước

- **OS**: Windows 10 / 11 (64bit). Windows Server cũng được.
- **Mạng**: PC đó cùng LAN với các máy in. Có thể truy cập internet (HTTPS đến tên miền ERP).
- **Quyền**: Tài khoản có thể nhập mật khẩu admin trên PC (cần phê duyệt UAC).
- **Tường lửa**: Cho phép gửi SNMP (UDP 161). Kiểm tra chính sách tường lửa nội bộ.

#### Luồng cài đặt

1. Chép ZIP vào PC qua USB → Giải nén vào thư mục bất kỳ.
2. **Chuột phải vào `install.bat` → Chạy với quyền quản trị**.
3. Hộp thoại UAC → "Có".
4. Console (TUI):
   ```
   ╔════════════════════════════════════╗
   ║  TELLUSTECH SNMP AGENT — Setup     ║
   ╚════════════════════════════════════╝
   1. Đang quét mạng... (192.168.1.0/24)
      → Phát hiện 5 thiết bị SNMP
   2. Đăng ký thiết bị nào? (PC này phụ trách)
      [1] 192.168.1.10  Samsung X7500  SN: K0123456
      [2] 192.168.1.11  Sindoh D330    SN: D0234567
      ...
      Chọn (phân cách bằng dấu phẩy, all=tất cả): _
   ```
5. Chọn số → Đề nghị đăng ký lên ERP → Hiển thị kết quả đăng ký trên màn hình.
6. Cuối cùng tự động vào silent mode → Ẩn xuống tray.
7. **Cuối `install.bat` tự động xóa `config.json`** (ngăn lộ token nếu mất USB).

#### Vị trí cài đặt / Tự khởi động

- Thư mục cài đặt: `C:\Tellustech\` (chỉ tài khoản người dùng truy cập được)
- Đăng ký vào Startup: Tự chạy `tellustech-agent.exe --silent` khi khởi động
- Local queue DB: `C:\Tellustech\agent.db` (SQLite — Lưu giữ khi gửi thất bại, retry)

### Step 5. Xác nhận thu thập đầu tiên (Quản trị viên, trụ sở)

1. Trong vòng 5 phút sau khi cài đặt xong, vào ERP trụ sở → sidebar → SNMP → **Tab 2 Tình hình thu thập**.
2. Kiểm tra các S/N đã đăng ký có được thêm vào dòng với **Phương thức=AGENT** hay không.
3. **Nếu thiếu S/N**:
   - **Tab 1 (Model OID)**: Kiểm tra OID của model đó có phản hồi từ máy in này không (snmpwalk ở Step 12.1).
   - **PC khách hàng**: Chuột phải vào agent ở tray → "Xem trạng thái" (hoặc trong cmd `tellustech-agent.exe --status`) → Kiểm tra log thử gần đây + queue pending.
   - **Tường lửa**: Trên PC đó `Test-NetConnection <IP máy in> -Port 161 -Information Detailed` (UDP khó test trực tiếp → snmpwalk chắc chắn hơn).

### Step 6. Luồng tự động thu thập (sau đó tự động)

| Thời điểm | Hành động | Tại đâu |
|---|---|---|
| Hàng ngày 00:00 (giờ PC) | Chỉ poll thiết bị khớp với `snmpCollectDay` | Agent |
| Poll thành công | Gửi `POST /api/snmp/readings` đến ERP → Tạo dòng SnmpReading | Agent → ERP |
| Poll thất bại | Retry 5 lần mỗi giờ. Sau 5 lần báo lỗi heartbeat | Agent |
| Hàng giờ | heartbeat (`POST /api/snmp/heartbeat`) — agentVersion / thời gian online | Agent |
| Hàng ngày 12:00 (giờ PC) | Kiểm tra cập nhật tự động (`/api/snmp/agent-version`) | Agent |
| Ngày 1 hàng tháng 03:00 KST | Tự động tạo UsageConfirmation (`/api/jobs/snmp-usage-check`) | ERP cron |

### Step 7. Xử lý phiếu xác nhận sử dụng hàng tháng (Mục 12.3)

→ Chuyển đến 12.3.

---

## 12.3 Phiếu xác nhận sử dụng (`/admin/usage-confirmations`)

Đây là luồng tạo **Phiếu xác nhận để khách hàng ký** + **Phiếu doanh thu** được tự động tạo hàng tháng từ counter đã thu thập.

### Workflow 6 bước

```
COLLECTED → CUSTOMER_NOTIFIED → CUSTOMER_CONFIRMED → ADMIN_CONFIRMED → PDF_GENERATED → BILLED
   ⬜            🟡                    🟢                  🔵              📄          ✅
   Hoàn tất     Đã thông báo          Khách hàng         Quản trị viên   Tạo PDF     Liên kết
   thu thập     khách hàng            CFM hoàn tất       CFM             xong        doanh thu
```

Nút [Hành động] bên phải mỗi dòng chỉ hiển thị bước tiếp theo phù hợp với trạng thái hiện tại.

### Tự động tạo (quản trị viên không cần đụng tay)

Hàng tháng, vào **ngày tiếp theo** của `snmpCollectDay` (mặc định ngày 25) của hợp đồng IT ACTIVE, lúc 03:00 KST cron sẽ chạy:
- Tất cả SnmpReading của thiết bị thuộc hợp đồng đó đã đến chưa?
  - **Đã đến đầy đủ** → tự động tạo `UsageConfirmation` (status=COLLECTED).
  - **Chỉ đến một phần** → chuyển sang hàng đợi xét duyệt của quản trị viên (cần nhập tay).
  - **Hoàn toàn chưa đến** → không có thông báo. Thử lại vào ngày hôm sau.

### Nhập bộ đếm thủ công (chưa cài đặt agent / sự cố tạm thời)

1. Sidebar → SNMP → Tab 2 → **[+ Nhập thủ công]**.
2. Nhập hợp đồng / S/N / bộ đếm trắng đen·màu → lưu.
3. Cron UsageConfirmation sẽ tự động xử lý dữ liệu đó vào thời điểm đã định kế tiếp.

### Công thức tính lượng sử dụng (tự động)

```
Lượng sử dụng tháng (số bản)        = Bộ đếm tháng này - Bộ đếm tháng trước
Sử dụng vượt mức (số bản)           = max(0, Lượng sử dụng tháng - Số bản bao gồm mặc định)
Phí vượt mức (₫)                    = Sử dụng vượt mức × Đơn giá phụ thu
Tổng tiền hóa đơn (₫)               = Phí cơ bản tháng + Phí vượt B/W + Phí vượt Color
```

#### Xử lý số âm / reset bộ đếm (tự động)

- Nếu xuất hiện số âm (lần này < lần trước) → clip lượng sử dụng về 0 + cờ `isCounterReset=true`.
- Trên PDF có dấu ⚠ + dòng đó tự động loại khỏi đối tượng tính phí.
- Nếu `resetAt` của ItContractEquipment nằm trong khoảng prev~curr thì bỏ qua prev (ví dụ thay mainboard).

#### Xử lý tháng đầu tiên

- prev = không có → dùng `installCounterBw / installCounterColor` làm prev.
- Hóa đơn tháng đầu = lượng sử dụng giữa thời điểm lắp đặt ~ lần đo đầu tiên.

### Hành động theo trạng thái (nút bên phải mỗi dòng)

| Trạng thái | Nút hiển thị | Khi nhấn sẽ xảy ra |
|---|---|---|
| ⬜ COLLECTED | **[Thông báo khách hàng]** | Tạo Notification cho người dùng portal của khách hàng + email (nếu đã cấu hình). status → CUSTOMER_NOTIFIED |
| 🟡 CUSTOMER_NOTIFIED | **[Nhắc lại]** / **[CFM thủ công]** | Nhắc lại: gửi lại cùng thông báo. CFM thủ công: bắt buộc ghi chú (ví dụ: "Xác nhận qua điện thoại 04-26") |
| 🟢 CUSTOMER_CONFIRMED | **[CFM quản trị]** | Quản trị viên xét duyệt thêm một lần nữa rồi phê duyệt |
| 🔵 ADMIN_CONFIRMED | **[Tạo PDF]** | pdf-lib + Noto Sans CJK + nhúng chữ ký khách hàng. status → PDF_GENERATED |
| 📄 PDF_GENERATED | **[📄 PDF]** / **[Phiếu doanh thu]** | PDF: tải về. **Phiếu doanh thu**: modal xác nhận → phát hành Sales mới + tự động tạo PayableReceivable (khoản phải thu). status → BILLED |
| ✅ BILLED | **[📄 PDF]** | Khóa — không thể chỉnh sửa thêm. Chỉ có thể tải lại PDF |

### Kịch bản vận hành đề xuất hàng tháng

```
Ngày 1, 03:00  → cron tự động xử lý → tạo 1 dòng COLLECTED cho mỗi khách hàng (quản trị viên không cần can thiệp)
Ngày 1, 09:00  → Quản trị viên: nhấn [Thông báo khách hàng] hàng loạt cho tất cả các dòng COLLECTED
Ngày 1~5      → Khách hàng đăng nhập portal → kiểm tra bộ đếm → ký → CUSTOMER_CONFIRMED
Ngày 6        → Quản trị viên: với khách hàng chưa xác nhận, nhấn [Nhắc lại] hoặc [CFM thủ công] (sau khi xác nhận qua điện thoại)
Ngày 6 chiều  → Quản trị viên: với tất cả các dòng CUSTOMER_CONFIRMED, nhấn [CFM quản trị] → [Tạo PDF] → [Phiếu doanh thu]
Ngày 8        → Gửi hóa đơn (đính kèm PDF từ module công nợ phải thu của tài chính)
```

---

## 12.4 Chi tiết hợp đồng IT — các trường liên quan SNMP (đăng ký·sửa thiết bị)

Tổng quan các trường liên quan SNMP của ItContractEquipment:

| Trường | Phân loại | Ghi chú |
|---|---|---|
| `deviceIp` | Tự động | Cập nhật bằng quét LAN khi agent chạy lần đầu. Cập nhật mỗi lần khi DHCP thay đổi. |
| `deviceModel` | Nhập khi đăng ký | Khóa của SnmpModelOid (dropdown) |
| `snmpCommunity` | Mặc định `public` | Thay đổi nếu chính sách công ty yêu cầu |
| `deviceToken` / `contractToken` | Hệ thống | UUID, chỉ lưu trong DB |
| `deviceTokenExpiresAt` / `RevokedAt` | Hệ thống | Sliding 60 ngày + thời điểm hủy |
| `snmpCollectDay` (hợp đồng) | Mặc định 25 | Chỉ trong khoảng 1~28 (tránh các tháng không có ngày 31) |
| `installCounterBw` / `Color` | Khi đăng ký | Mốc prev của tháng đầu |
| `baseIncludedBw` / `Color` | Khi đăng ký | Số bản bao gồm trong tháng |
| `extraRateBw` / `Color` | Khi đăng ký | Đơn giá vượt mức (₫/bản) |
| `resetAt` | Nhập trong vận hành | Thời điểm reset bộ đếm. Chỉ dùng bộ đếm sau thời điểm đó |
| `lastReadingAt` | Tự động | Thời điểm thu thập SNMP cuối cùng (giám sát health của agent) |

---

## 12.5 Vận hành agent — hằng ngày / xử lý sự cố / nâng cấp

### Kiểm tra hoạt động bình thường (1 lần/tháng)

1. Sidebar → SNMP → Tab 3 (token thiết bị).
2. Kiểm tra cột **Lần thu thập cuối** của tất cả thiết bị ACTIVE có nằm trong tháng đó không.
3. Thiết bị không thu thập từ 30 ngày trở lên → xử lý sự cố theo 12.5.1.

### 12.5.1 Sự cố thường gặp — chẩn đoán nhanh

| Triệu chứng | Nguyên nhân khả nghi | Xử lý |
|---|---|---|
| Lần thu thập cuối = hơn 1 tháng trước | PC tắt / mạng đứt | Hướng dẫn khách hàng khởi động lại. Kiểm tra biểu tượng tray |
| Không hề có dòng `Phương thức=AGENT` | Chưa cấp token / thiếu config.json / polling thất bại | Kiểm tra trạng thái token tại Tab 3 → cấp lại → triển khai gói mới |
| Badge số âm/reset xuất hiện thường xuyên | Bộ đếm thiết bị thực sự bị reset (thay mainboard / bảo trì) | Sửa thiết bị → nhập resetAt |
| Xuất hiện dòng mới trong `SnmpUnregisteredDevice(PENDING)` | Agent phát hiện máy in mới trong LAN | Xử lý hàng đợi thiết bị chưa đăng ký theo 12.5.2 |
| Cập nhật tự động của agent thất bại | AGENT_DOWNLOAD_URL sai / chặn tải xuống GitHub | Kiểm tra biến môi trường Railway. Nếu firewall nội bộ chặn github.com thì đổi sang mirror nội bộ |
| Lỗi heartbeat: "snmp_timeout" | SNMP máy in tắt / community khác | Kích hoạt SNMP v2c · public trong Web UI máy in |

### 12.5.2 Hàng đợi thiết bị chưa đăng ký (`SnmpUnregisteredDevice`)

Các thiết bị mà agent phát hiện khi quét LAN nhưng không khớp với `ItContractEquipment` của ERP sẽ được đưa vào hàng đợi ở trạng thái PENDING.

Cách xử lý:
1. Sidebar → SNMP → Tab hàng đợi chưa đăng ký (sắp tới) — hiện tại truy vấn DB trực tiếp (kế hoạch P2.B).
2. Sau khi xem xét, chọn một trong hai:
   - **Đăng ký làm thiết bị mới** → Hợp đồng IT → Thêm thiết bị → nhập S/N · IP → cấp token. Dòng trong hàng đợi tự động đổi status `REGISTERED`.
   - **Bỏ qua** → status `IGNORED` (ví dụ: máy in dùng nội bộ công ty)

### 12.5.3 Kịch bản hủy token

| Tình huống | Xử lý |
|---|---|
| Mất / bị trộm PC khách hàng | Ngay lập tức Sidebar → SNMP → hợp đồng tương ứng → [Hủy] toàn bộ token thiết bị. Sau khi chuẩn bị PC mới thì [Cấp lại] + gói mới |
| Nhân viên nghỉ việc (PC đó là chỗ ngồi của nhân viên đó) | [Hủy] → [Cấp lại] cho PC người kế nhiệm + triển khai lại gói |
| Kết thúc hợp đồng | [Hủy] (sẽ tự hết hạn sau 60 ngày nhưng nên chặn ngay) |

### 12.5.4 Nâng cấp agent (quản trị viên, trụ sở chính)

#### Chuẩn bị phiên bản mới

1. Lập trình viên sửa code `agent/` → bump version.
2. Build:
   ```
   cd agent
   build.cmd
   ```
   → `agent/build/tellustech-agent.exe` (single exe, ~57MB)

#### Triển khai

```
gh release create v1.0.1-agent agent/build/tellustech-agent.exe \
  --title "SNMP Agent v1.0.1" \
  --notes "Tóm tắt sửa lỗi / thêm tính năng"
```

#### Cập nhật biến môi trường (Railway hoặc console hosting)

| Biến | Giá trị |
|---|---|
| `AGENT_LATEST_VERSION` | `1.0.1` (semver) |
| `AGENT_DOWNLOAD_URL` | `https://github.com/jslee-sketch/tellustech-admin/releases/download/v1.0.1-agent/tellustech-agent.exe` |

#### Luồng triển khai tự động

- Hàng ngày 12:00 (theo giờ từng PC) agent gọi `/api/snmp/agent-version`.
- Nếu `latestVersion` trong response cao hơn phiên bản hiện tại → tải exe → lưu thành `tellustech-agent.exe.pending`.
- Khi PC khởi động lại lần kế tiếp hoặc chạy lại install.bat thì thay thế `.pending` thành file chính thức rồi chạy phiên bản mới.

> Nếu cần áp dụng ngay lập tức bắt buộc thì hướng dẫn khách hàng khởi động lại PC. Trong môi trường khó khởi động lại, có thể dùng `tellustech-agent.exe --restart` từ cmd (kế hoạch P2.B).

### 12.5.5 Giám sát Heartbeat

- Agent gọi `POST /api/snmp/heartbeat` mỗi giờ → ghi vào bảng AgentHeartbeat.
- Không có heartbeat từ 30 ngày trở lên → cảnh báo cho quản trị viên (kế hoạch P2.B, hiện tại truy vấn SQL trực tiếp).
- SQL:
  ```sql
  SELECT contract_id, agent_machine_id, MAX(reported_at)
  FROM agent_heartbeats
  GROUP BY contract_id, agent_machine_id
  HAVING MAX(reported_at) < NOW() - INTERVAL '30 days';
  ```

---

## 12.6 Tóm tắt bảo mật·chính sách

- Lưu token plaintext chỉ tồn tại trong `config.json`. Trong DB ERP cũng lưu plaintext (không hash) — vì cần verify mỗi lần. Thay vào đó quản lý rủi ro qua hủy·hết hạn·sliding renewal.
- File `config.json` bị tự động xóa ở cuối install.bat (phòng tránh rò rỉ khi mất USB).
- Thư mục cài đặt agent `C:\Tellustech` chỉ truy cập được với quyền của user đó.
- Nghi ngờ mất token → quản trị viên hủy ngay → cấp lại + gói mới.
- Phía ERP, mọi lịch sử sử dụng token được ghi vào `audit_log` (Prisma middleware).

---

## 12.7 Phụ lục kỹ thuật — lệnh·log·xác minh gói SNMP

> Phần này là tổng hợp các lệnh·đường dẫn·quy trình debug dành cho **kỹ thuật viên IT hiện trường / đội IT nội bộ**.

### 12.7.1 Tùy chọn dòng lệnh agent

| Tùy chọn | Hành vi | Nơi sử dụng |
|---|---|---|
| `tellustech-agent.exe --setup` | Lần đầu chạy — quét mạng + chọn user + đăng ký với ERP | install.bat tự động gọi |
| `tellustech-agent.exe --silent` | Chạy nền — chạy cron scheduler | Tự động chạy khi khởi động |
| `tellustech-agent.exe --collect` | Thu thập 1 lần ngay lập tức (debug) | Khi tray không phản hồi thì chạy trực tiếp |
| `tellustech-agent.exe --status` | In log gần nhất + hàng đợi pending | Chẩn đoán |
| `tellustech-agent.exe --version` | In phiên bản exe | Kiểm tra cập nhật |

### 12.7.2 Đường dẫn file·thư mục

| Đường dẫn | Nội dung | Quyền |
|---|---|---|
| `C:\Tellustech\tellustech-agent.exe` | exe chính (~57MB, Node18 + pkg) | User RX |
| `C:\Tellustech\config.json` | erpUrl + token contract/device (tự động xóa sau khi install → setup lần đầu chỉ trong memory, sau đó là file rỗng hoặc không tồn tại) | User RW |
| `C:\Tellustech\agent.db` | SQLite — hàng đợi pending (lưu khi gửi thất bại, hàng đợi retry) | User RW |
| `C:\Tellustech\agent.log` | Log xoay vòng theo ngày (info/warn/error) | User RW |
| `C:\Tellustech\tellustech-agent.exe.pending` | File tạm tải xuống cho cập nhật tự động. Khi khởi động lại·chạy lại sẽ thay thế file chính rồi xóa | User RW |
| `C:\Users\<user>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\TellustechAgent.lnk` | Shortcut tự động chạy khi khởi động (`--silent`) | User RW |

### 12.7.3 Xem log·chẩn đoán

```cmd
:: 100 dòng gần nhất
type C:\Tellustech\agent.log | more

:: Chỉ lỗi
findstr /I "ERROR WARN" C:\Tellustech\agent.log | more

:: Realtime
powershell -c "Get-Content C:\Tellustech\agent.log -Wait -Tail 50"
```

Định dạng dòng log:
```
2026-04-28T10:15:32+09:00 [INFO]  poll  192.168.1.10  total=12345 bw=10000 color=2345
2026-04-28T10:15:33+09:00 [INFO]  send  contract=TLS-260101-001  rows=1  ok=200
2026-04-28T10:15:34+09:00 [WARN]  poll  192.168.1.11  snmp_timeout (3s)
2026-04-28T10:15:35+09:00 [ERROR] send  401 unauthorized — token revoked or expired
```

### 12.7.4 Truy vấn trực tiếp hàng đợi pending

Các reading gửi thất bại được lưu vào hàng đợi SQLite. Nếu hệ thống có sẵn sqlite3:

```cmd
sqlite3 C:\Tellustech\agent.db "SELECT id, equipment_sn, total_pages, attempts, last_error FROM pending ORDER BY id DESC LIMIT 20;"
```

Sau đó cưỡng chế gửi lại:
```cmd
tellustech-agent.exe --flush-pending
```

### 12.7.5 Kiểm tra trực tiếp phản hồi SNMP

#### Windows + snmpwalk (phiên bản Net-SNMP cho Windows hoặc PowerShell)

PowerShell (module `SNMP-Tools` hoặc `Olive.SnmpSharpNet`):
```powershell
# Bộ đếm tổng theo chuẩn RFC 3805
$ip = "192.168.1.10"
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.10.2.1.4.1.1
# Dự kiến: HOST-RESOURCES-MIB::hrPrinterDetectedErrorState.1 = INTEGER: 12345

# S/N
snmpwalk -v2c -c public $ip 1.3.6.1.2.1.43.5.1.1.17.1
```

#### Linux / WSL (snmpwalk)
```bash
sudo apt install snmp -y
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.10.2.1.4.1.1
snmpwalk -v2c -c public 192.168.1.10 1.3.6.1.2.1.43.5.1.1.17.1
```

#### Danh sách kiểm tra khi không có phản hồi

1. PC và máy in có nằm trong **cùng một subnet** không? (`route print` hoặc `ip route`)
2. SNMP trên máy in đã được bật chưa? Web UI máy in → Network → SNMP → **kích hoạt v2c, public, Read**.
3. Tường lửa nội bộ có chặn UDP 161 không? (`Test-NetConnection -ComputerName 192.168.1.10 -Port 161` — UDP không kiểm tra trực tiếp được nên lệnh snmpwalk ở trên là chắc chắn nhất)
4. Community không phải `public` mà theo chính sách công ty (`tellustech` v.v.)? → Thay đổi `snmpCommunity` trên màn hình OID model 12.1 + PATCH thiết bị.
5. Một số máy in chỉ hỗ trợ SNMPv1 → thử với `-v1`. Một số chỉ hỗ trợ v3 — trường hợp đó cần thêm model riêng.

### 12.7.6 Xác minh đến cùng bằng packet capture (biện pháp cuối)

```
1. Cài Wireshark hoặc tcpdump (WSL) trên PC đó
2. Filter: udp.port == 161 and ip.addr == <IP máy in>
3. Chạy snmpwalk
4. Có thấy đồng thời SNMP GetRequest / GetResponse không?
   - Chỉ thấy GetRequest → Máy in không trả lời (tường lửa / SNMP off / community khác)
   - Thấy cả hai nhưng phản hồi là noSuchObject → OID khác (xác minh OID model)
   - Phản hồi INTEGER bình thường → Mọi thứ OK. Vấn đề ở phía agent (config.json / token)
```

### 12.7.7 Chế độ tray/service (hiện tại vs sau này)

Hiện tại (v1.0.x):
- Dựa trên **session người dùng**. Sau khi khởi động, người dùng đó phải đăng nhập thì mới chạy tự động (shortcut Startup).
- Chỉ hoạt động với một tài khoản người dùng trên một PC. Nếu PC đang ở trạng thái logout thì việc thu thập dừng lại.

Tương lai (dự kiến v2.0):
- Chế độ **Windows Service**. Hoạt động luôn luôn bất kể trạng thái đăng nhập của người dùng.
- Có thể đăng ký bằng `nssm install TellustechAgent C:\Tellustech\tellustech-agent.exe --silent` (khi dùng NSSM).

> Hiện tại được tối ưu cho môi trường mà PC luôn bật và người dùng tại chỗ gần như luôn đăng nhập. Với môi trường không người trực 24/7, khuyến nghị dùng chế độ service trong tương lai.

### 12.7.8 Endpoint chẩn đoán phía ERP

| Endpoint | Mục đích | Xác thực |
|---|---|---|
| `GET /api/snmp/agent-version` | Phiên bản exe mới nhất + URL tải | Không (tĩnh) |
| `POST /api/snmp/heartbeat` | Agent gọi mỗi giờ | `Authorization: Bearer <contractToken>` |
| `POST /api/snmp/readings` | Agent gửi bộ đếm | `Authorization: Bearer <deviceToken>` |
| `POST /api/snmp/register-devices` | Agent đăng ký thiết bị mới phát hiện | `Authorization: Bearer <contractToken>` |

Khi chẩn đoán từ trụ sở (trình duyệt hoặc curl):
```bash
# Thông tin phiên bản mới nhất
curl https://tellustech-admin-production.up.railway.app/api/snmp/agent-version

# Tính hợp lệ của token (200 = hợp lệ, 401 = đã hủy/hết hạn)
curl -X POST https://.../api/snmp/heartbeat \
  -H "Authorization: Bearer ctr_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"agentVersion":"1.0.0","agentMachineId":"test"}'
```

### 12.7.9 SQL phía ERP thường dùng (admin console / IT team trực tiếp)

```sql
-- Thiết bị đã thu thập trong 24 giờ gần nhất
SELECT contract_id, equipment_id, MAX(collected_at) AS last
  FROM snmp_readings
  WHERE collected_at >= NOW() - INTERVAL '1 day'
  GROUP BY contract_id, equipment_id
  ORDER BY last DESC;

-- Thiết bị không thu thập từ 30 ngày trở lên (heartbeat monitor)
SELECT eq.id, eq.serial_number, c.contract_number, eq.last_reading_at
  FROM it_contract_equipment eq
  JOIN it_contracts c ON eq.it_contract_id = c.id
  WHERE c.status = 'ACTIVE' AND eq.removed_at IS NULL
    AND (eq.last_reading_at IS NULL OR eq.last_reading_at < NOW() - INTERVAL '30 days')
  ORDER BY eq.last_reading_at NULLS FIRST;

-- Token sắp hết hạn (trong vòng D-7)
SELECT serial_number, device_token_expires_at
  FROM it_contract_equipment
  WHERE device_token_revoked_at IS NULL
    AND device_token_expires_at < NOW() + INTERVAL '7 days';

-- Thiết bị thường xuyên reset bộ đếm (kiểm tra tính nhất quán cho admin)
SELECT equipment_id, COUNT(*) AS reset_count
  FROM snmp_readings
  WHERE is_counter_reset = TRUE
    AND collected_at >= NOW() - INTERVAL '90 days'
  GROUP BY equipment_id
  HAVING COUNT(*) >= 3
  ORDER BY reset_count DESC;
```

# Phần 13. Phân tích tỷ lệ phù hợp của vật tư tiêu hao (NEW)

Module tự động phát hiện hiệu suất, tín hiệu tồn kho và **nghi ngờ sử dụng gian lận** bằng cách so sánh lượng vật tư tiêu hao đầu vào (toner, drum v.v.) với lượng output thực tế từ SNMP.

## 13.1 Công thức cốt lõi

```
Lượng output kỳ vọng = Số lượng đầu vào × Số trang định mức × (Mật độ chuẩn ÷ Mật độ thực tế)
Tỷ lệ phù hợp (%)    = Lượng output thực tế ÷ Lượng output kỳ vọng × 100
```

- **Đen trắng (B/W)**: Tổng hợp Black toner + Drum + Fuser
- **Màu (C)**: Tổng hợp theo nhóm C/M/Y rồi lấy **MIN** (1 trang = tiêu thụ đồng thời C+M+Y) — nếu thiếu một màu thì loại khỏi phân tích màu

### 5 cấp badge

| Tỷ lệ phù hợp | Badge | Ý nghĩa | Hành động tự động |
|---|---|---|---|
| Từ 120% trở lên | 🔵 BLUE | Thiếu toner — cần đầu vào bổ sung | (dự kiến mở rộng) Cảnh báo đặt hàng lại |
| 80~119% | 🟢 GREEN | Bình thường | Không có |
| 50~79% | 🟡 YELLOW | Chú ý — nghi ngờ đầu vào quá mức | Theo dõi |
| 30~49% | 🟠 ORANGE | Cảnh báo — kiểm tra lý do | Thông báo cho admin |
| Dưới 30% | 🔴 RED | Nghi ngờ gian lận | Thông báo admin + tự động ghi audit_log + isFraudSuspect=true |

Ngưỡng có thể điều chỉnh trong tab **Cài đặt** của `/admin/yield-analysis` (có kiểm tra giảm dần đơn điệu).

## 13.2 Công việc chuẩn bị — Nhập yield vào master phẩm phẩm

1. **Master phẩm phẩm** → loại CONSUMABLE hoặc PART → Sửa
2. Nhập mục "Liên quan đến output (vật tư tiêu hao)":
   - **Số trang output định mức** (do nhà sản xuất công bố, dựa trên mật độ 5%): Ví dụ 25.000
   - **Mật độ chuẩn (%)**: Mặc định 5

> Nếu không nhập, phụ tùng tương ứng sẽ bị bỏ qua trong tính toán tỷ lệ phù hợp. Seed sẽ tự động ánh xạ toner/drum hiện có (theo mẫu build-in).

## 13.3 Công việc chuẩn bị — Mật độ thực tế theo thiết bị

Chi tiết hợp đồng IT → tab **Danh sách thiết bị** → cột **"Mật độ thực tế"** trên mỗi dòng cho phép nhập inline (1~100%).
- Mặc định 5% — môi trường văn phòng phổ thông.
- Khách hàng in nhiều ảnh/đồ họa thì điều chỉnh lên 10~15% v.v.
- Phản ánh ngay khi tính lại tỷ lệ phù hợp.

## 13.4 Thực thi tính tỷ lệ phù hợp

### Tự động — cron hằng tháng
- `/api/jobs/yield-analysis-monthly` (ngày 1 hàng tháng lúc 02:00 KST)
- Tính hàng loạt cho tất cả thiết bị thuộc các hợp đồng ACTIVE của tháng trước.
- Nếu có dù chỉ 1 SNMP reading hoặc AsDispatchPart thì là đối tượng phân tích.
- Badge RED → tự động thông báo đến tất cả người dùng ADMIN (loại `YIELD_FRAUD_SUSPECT`, 3 ngôn ngữ).

### Thủ công — tính lại cho 1 thiết bị
Hợp đồng IT → dòng danh sách thiết bị → nút 📊 → tính cho khoảng thời gian 6 tháng gần nhất.

### Thủ công — đồng bộ hàng loạt (kiểm thử/quản trị)
```
curl -X POST "<host>/api/jobs/yield-analysis-monthly?sync=1&targetMonth=2026-04" \
  -H "Authorization: Bearer $CRON_SECRET"
```
Phản hồi: `{ total, created, fraudCount, skippedNoData }`

## 13.5 Dashboard (`/admin/yield-analysis`)

### Tab 1 — Tình hình tổng thể
- **Group view theo đơn vị hợp đồng**: Khi click dòng số hợp đồng, ▾ mở rộng hiển thị các dòng S/N thiết bị.
- Dòng group hiển thị **tỷ lệ phù hợp thấp nhất** trong hợp đồng + số lượng nghi ngờ gian lận.
- Sắp xếp: Tăng dần theo tỷ lệ phù hợp thấp nhất (nguy hiểm nhất lên trước).
- **Tìm kiếm/lọc**: Số hợp đồng / khách hàng / S/N thiết bị / ngày bắt đầu·kết thúc / badge (5 cấp) — khớp một phần, có nút **Đặt lại**.

### Tab 2 — Quản lý nghi ngờ gian lận
- Chỉ hiển thị isFraudSuspect=true + tìm kiếm/lọc trên hoạt động giống như trên.
- Hành động trên dòng [Ghi chú điều tra] → mở modal nhập ghi chú → khi lưu sẽ tự động ghi fraudReviewedById/At.
- Sau khi đã hoàn tất điều tra vẫn có thể chỉnh sửa ghi chú qua [Kết quả điều tra].

### Tab 3 — Thống kê theo khách hàng
- Số phân tích, tỷ lệ phù hợp trung bình, số nghi ngờ gian lận theo từng khách hàng.
- (Trong tương lai sẽ mở rộng thành **thống kê theo kỹ thuật viên** dựa trên AsDispatchPart.dispatchEmployee)

### Tab 4 — Cài đặt
- Điều chỉnh ngưỡng BLUE/GREEN/YELLOW/ORANGE + ngưỡng cảnh báo gian lận.
- Kiểm tra giảm dần đơn điệu (Blue > Green > Yellow > Orange > 0).

## 13.6 Cột tỷ lệ phù hợp ở màn hình tình hình bán hàng

Danh sách bán hàng `/sales` — chỉ hiển thị **tỷ lệ phù hợp thấp nhất** theo đơn vị khách hàng đối với doanh số dự án RENTAL:
- Định dạng `B/W 🟢 90%  C 🟢 90%` (B/W=đen trắng, C=màu)
- Dựa trên giá trị đáng lo ngại nhất trong số các thiết bị thuộc hợp đồng IT của cùng khách hàng
- Click sẽ chuyển tới dashboard tỷ lệ phù hợp
- Doanh số phi-RENTAL như TRADE/MAINTENANCE hiển thị "—"

## 13.7 Thông báo

Khi phát sinh nghi ngờ gian lận, tự động tạo `Notification` cho tất cả người dùng ADMIN:
- Tiêu đề: `Phát hiện bất thường tỷ lệ phù hợp vật tư tiêu hao — {S/N}`
- Nội dung: Số hợp đồng, khách hàng, tỷ lệ phù hợp đen trắng/màu
- Liên kết: `/admin/yield-analysis?id={analysisId}`
- Lưu đồng thời 3 ngôn ngữ (vi/en/ko)

## 13.8 Tóm tắt mô hình dữ liệu

| Mô hình | Vai trò |
|---|---|
| `Item.expectedYield`, `yieldCoverageBase` | Định mức/chuẩn theo phẩm phẩm |
| `ItContractEquipment.actualCoverage` | Mật độ thực tế theo khách hàng (mặc định 5) |
| `ItContractEquipment.lastYieldRateBw/Color/CalcAt` | Cache kết quả tính cuối cùng (dùng cho sắp xếp/lọc) |
| `YieldAnalysis` | Lịch sử phân tích (kỳ·thực tế·kỳ vọng·badge·gian lận·ghi chú điều tra) |
| `YieldConfig` | Cài đặt ngưỡng (single row, id="default") |
| `YieldBadge` enum | BLUE / GREEN / YELLOW / ORANGE / RED |
| `NotificationType.YIELD_FRAUD_SUSPECT` | Loại thông báo nghi ngờ gian lận |

---

# Phần 14. Tải xuống / Tải lên — Phạm vi trách nhiệm của quản trị viên

Nếu phụ lục D của manual A tập trung vào người dùng phổ thông, thì chương này đề cập **các thao tác tải xuống/tải lên chỉ admin truy cập được** + **chính sách vận hành cho các tác vụ hàng loạt toàn hệ thống**.

## 14.1 Import migration ECOUNT (`/admin/ecount-import` — công cụ nội bộ)

**Mục đích**: Đưa toàn bộ master khách hàng/phẩm phẩm/bán hàng/mua hàng từ ECOUNT ERP cũ vào một lần.

**Định dạng file**: ECOUNT export XLSX nguyên bản. Header tiếng Hàn (`거래처코드`, `품목명`, `구분`, `카테고리` v.v.).

⚠️ **Công cụ chỉ dùng 1 lần**. Không hỗ trợ import định kỳ trong vận hành — sửa giá trị ECOUNT rồi import lại cũng không đồng bộ. Khách hàng đã import có thể được nhận diện qua itemCode/clientCode để cập nhật giống PATCH, nhưng có rủi ro ghi đè ngoài ý muốn.

⚠️ **Cần chỉ định mã công ty rõ ràng**. Phải chọn dữ liệu ECOUNT thuộc TV hay VR ngay trước khi import. Nếu chọn sai, việc đính chính sau này sẽ tốn nhiều thời gian.

💡 **Mẹo hay**:
- **Làm sạch dữ liệu trước**. Khách hàng ngủ đông/trùng lặp trong ECOUNT cần được dọn dẹp ở phía ECOUNT trước khi import.
- Kiểm tra trước bằng **dry-run** (chỉ 3 dòng). Xem mapping cột có đúng không (`구분=PRODUCT/CONSUMABLE/PART`, `카테고리=description`).
- **Giữ thứ tự**: Khách hàng → phẩm phẩm → mua hàng → bán hàng. Nếu bán hàng vào trước thì sẽ bị từ chối do khách hàng chưa tồn tại.

## 14.2 Tải gói SNMP agent (`/admin/snmp` tab 3)

**Mục đích**: Tạo bộ ZIP để cài lên PC khách hàng.

⚠️ **`config-{contractCode}.json` chứa token ở dạng plain text**. Nếu mất USB, [hủy] ngay tất cả token thiết bị thuộc hợp đồng đó.

⚠️ **install.bat tự động xóa config.json ở cuối** — nếu cần cài lại trên PC đó thì phải nhận gói mới.

⚠️ **agent exe (~57MB)** được lưu riêng trên GitHub Releases. Không tải lại mỗi lần tạo gói — lưu một chỗ trên PC trụ sở rồi tái sử dụng.

💡 **Mẹo hay**:
- **1 ZIP cho mỗi đơn vị hợp đồng**. Nếu một khách hàng có nhiều PC thì có thể dùng cùng bản sao ZIP (token hợp đồng giống nhau, chỉ khác token thiết bị).
- Khuyến nghị **đối chiếu checksum**: SHA256 trên trang GitHub Release vs exe đã tải.
- **Ghi phiên bản**: Đặt phiên bản ngay trong tên file ZIP như `tellustech-agent-{khách hàng}-v1.0.0.zip`.

## 14.3 PDF xác nhận sử dụng (`/admin/usage-confirmations`)

**Mục đích**: PDF xác nhận sử dụng theo tháng cho khách hàng ký + đính kèm phiếu doanh thu.

⚠️ **Sau khi tạo PDF không thể sửa bộ đếm**. Trước khi tạo PDF là cơ hội kiểm tra cuối cùng.

⚠️ **Nhúng font Noto Sans CJK**. Cả tiếng Hàn và tiếng Việt đều phải hiển thị đúng trong PDF. Nếu thiếu file font sẽ in ra ô vuông □□□ — trường hợp này gọi IT team.

💡 **Mẹo hay**:
- **Xử lý hàng loạt 2 tuần một lần**: Đầu tháng cron tự chạy → ngày 5 khách hàng confirm → ngày 6 [admin CFM] hàng loạt → [tạo PDF] → [phiếu doanh thu]. Quy trình rất gọn gàng.
- **Xử lý khách hàng chưa confirm**: Quá 5 ngày chưa confirm thì [nhắc lại] hoặc gọi điện rồi [CFM thủ công] (bắt buộc ghi chú). Trong PDF sẽ hiện ghi chú "đã xác nhận qua điện thoại".

## 14.4 Báo cáo tỷ lệ phù hợp (`/admin/yield-analysis`)

⚠️ Hiện tại chỉ xem trên màn hình. Export CSV/Excel sẽ bổ sung sau (backlog).

💡 **Mẹo hay**: Trên màn hình → tab "Quản lý nghi ngờ gian lận" → click chuột phải vào dòng → in trang (sidebar tự ẩn — tham khảo 12.1) để tạm tạo PDF.

## 14.5 Export audit log (`/admin/audit-logs`)

⚠️ **Chú ý dữ liệu lớn**. Một năm có thể lên tới hàng triệu dòng. Khuyến nghị áp dụng bộ lọc tìm kiếm trước khi export.

⚠️ **Quyền export riêng**. ADMIN thông thường có thể xem log nhưng cần được cấp quyền riêng để export (bảo mật thông tin).

💡 **Mẹo hay**:
- **Ngay sau khi đóng sổ kế toán** thì export backup audit log của tháng đó. Phòng ngừa cho audit ngoài.
- **Thời gian lưu trữ**: Tối thiểu 5 năm (luật kế toán Việt Nam). Trong DB lưu vô thời hạn, nhưng khuyến nghị mỗi quý tách 30 ngày dữ liệu sang nơi lưu trữ backup S3/bên ngoài.

## 14.6 Chính sách vận hành chung

| Tác vụ | Quyền | Tần suất |
|---|---|---|
| Import ECOUNT | ADMIN | 1 lần (khi migration) |
| Upload hàng loạt khách hàng/phẩm phẩm/bán hàng | MANAGER+ | Khi cần |
| Đăng ký hàng loạt tài khoản người dùng | ADMIN | 1 quý 1 lần (khi nhân viên mới vào hàng loạt) |
| Thay đổi hàng loạt ma trận quyền | ADMIN | Khi có quyết định nhân sự |
| Gói SNMP agent | MANAGER+ | Khi triển khai khách hàng mới |
| PDF xác nhận sử dụng | MANAGER+ | Hàng tháng 1 lần (hàng loạt) |
| Export audit log | ADMIN (quyền riêng) | Khi audit ngoài / đóng sổ kế toán |
| Backup toàn bộ DB (Railway console) | DevOps | Tự động hàng ngày |

⚠️ **Tất cả tác vụ hàng loạt đều tự động ghi vào audit_log**. Có thể truy vết ai đã thay đổi hàng loạt cái gì khi nào.

⚠️ **Khi tải lên lại sau khi thất bại một phần**: Nếu cùng code (`itemCode/clientCode/salesNumber`) đã tồn tại sẽ hoạt động theo upsert (ghi đè). Để tránh ghi đè ngoài ý muốn, khuyến nghị export backup trước khi import.

---

# Phần 15. Quy trình Mock Doanh thu (NEW — Triển khai cuối tháng 4/2026)

DRAFT doanh thu được phát hành tự động hàng tháng + luồng hành động theo persona (kỹ thuật/kinh doanh/tài chính).

## 15.1 Khái niệm cốt lõi

Cron `/api/jobs/rental-mock-sales-monthly` chạy lúc 09:00 KST ngày 1 hàng tháng sẽ:
- Tự động phát hành 1 **DRAFT Sales** cho mỗi hợp đồng IT ACTIVE + tất cả TM rental đang chạy của tháng trước (idempotent).
- Doanh thu IT = nhập tạm cước cơ bản, sử dụng phát sinh = 0 (sau khi UC ADMIN_CONFIRMED sẽ tự động điền).
- Doanh thu TM = tổng hợp tất cả các dòng.

Thông tin đăng ký cron-job.org: tham khảo Phần 14.

## 15.2 4 huy hiệu giai đoạn + tự động chuyển tiếp

| Giai đoạn | Điều kiện | Trigger chuyển tiếp tự động |
|---|---|---|
| 🟡 TECH | `isDraft=true && !technicianReady` | (IT) Khi xác nhận sử dụng ADMIN_CONFIRMED → 🟠 |
| 🟠 SALES | `isDraft=true && technicianReady` | Kinh doanh nhấn [Phát hành doanh thu] → 🔵 |
| 🔵 FINANCE | `!isDraft && !financeConfirmedAt` | Tài chính nhấn [CFM] → 🟢 |
| 🟢 DONE | `financeConfirmedAt!=null` | (Đối tượng chốt sổ kế toán) |

> TM không có luồng SNMP nên ngay khi cron phát hành sẽ `technicianReady=true` → đi thẳng tới 🟠.

## 15.3 Màn hình mới

- `/sales` — KPI giai đoạn + select giai đoạn + huy hiệu cột + bộ lọc "Cần hành động của tôi"
- `/sales/[id]` — Huy hiệu giai đoạn ở phần đầu + nút [🟠 Phát hành doanh thu] / [🔵 CFM tài chính] / [Mở khóa tài chính]
- `/finance/sales-confirm` — Tổng hợp riêng các doanh thu giai đoạn 🔵 với checkbox để **CFM hàng loạt**

## 15.4 API mới

- `POST /api/jobs/rental-mock-sales-monthly?sync=1&targetMonth=YYYY-MM` — cron + tùy chọn đồng bộ
- `POST /api/sales/[id]/confirm` — Kinh doanh phát hành (tự động phát hành PR)
- `POST /api/sales/[id]/finance-confirm` — Tài chính CFM (lock)
- `DELETE /api/sales/[id]/finance-confirm` — Chỉ ADMIN mới được mở khóa
- `POST /api/rental/it-contracts/[id]/terminate` — Chấm dứt sớm (thu hồi thiết bị + xóa DRAFT tương lai)
- `POST /api/rental/tm-rentals/[id]/terminate` — TM tương tự

## 15.5 Script backfill

Điền dữ liệu các tháng quá khứ một lần:
```
DATABASE_URL=... npx tsx scripts/backfill-mock-sales.ts 2026-01 2026-02 2026-03
```

---

# Phần 16. Quản lý tài khoản portal khách hàng (NEW)

Trước đây: chỉ có API mà không có UI → đã thêm card vào trang chi tiết khách hàng.

## 16.1 Vị trí

Truy cập `/master/clients/[id]` → card phía dưới **🔐 Tài khoản portal khách hàng**.

## 16.2 Hành động

- **Chưa có tài khoản** → `[+ Cấp tài khoản (ID = {clientCode})]` — username = clientCode, mật khẩu mặc định `1234`, mustChangePassword=true.
- **Đã có tài khoản** →
  - Hiển thị ID đăng nhập / Trạng thái / Lần đăng nhập cuối / Đang dùng mật khẩu mặc định.
  - **🔑 Reset mật khẩu về 1234** — khi khách hàng quên mật khẩu.
  - **🚫 Vô hiệu hóa / ✅ Kích hoạt** — khi kết thúc hợp đồng v.v.

## 16.3 Reset mật khẩu nhân viên

`/admin/permissions` → Chọn người dùng bên trái → Nút **🔑 Reset mật khẩu (1234)** trên header.
- Chỉ ADMIN mới làm được, mật khẩu `1234` + mustChangePassword=true.

## 16.4 Lịch sử thay đổi chính sách mật khẩu

- Chính sách cũ: `username = "{clientCode}-portal"`, mật khẩu tùy ý
- Chính sách hiện tại: `username = clientCode`, mật khẩu mặc định `1234`, bắt buộc đổi khi đăng nhập lần đầu

> Khách hàng không thể đăng nhập bằng ID cũ (`xxx-portal`) có thể giải quyết ngay bằng [Cấp lại] hoặc [Reset mật khẩu] tại mục 16.1.

---

# Phần 17. Mô tả tình trạng hiện tại của tồn kho (NEW)

Trường mới trên InventoryItem:
- `stateNoteVi / stateNoteEn / stateNoteKo` — Văn bản tự do (tự động dịch sang 3 ngôn ngữ khi lưu).
- `stateNoteOriginalLang` — Ngôn ngữ gốc của nội dung nhập.

Phân loại tốt/lỗi vẫn dùng enum `status` hiện có:
- 🟢 **Tốt** = `NORMAL`
- 🔴 **Lỗi** = `NEEDS_REPAIR` / `PARTS_USED` / `IRREPARABLE`

Hiển thị UI sẽ làm sau — hiện tại có thể xử lý qua schema + modal Remark hiện có + thay đổi status.

---

# Bổ sung 1 — Thu thập tự động SNMP¹⁰ (chuyên sâu)

> ¹⁰ SNMP = Simple Network Management Protocol. Giao thức truy vấn trạng thái và bộ đếm của thiết bị mạng thông qua OID tiêu chuẩn.

## Toàn bộ workflow (góc nhìn quản trị viên)

```
[1] Cài đặt Windows Agent tại khách hàng (admin tải xuống → cấp token)
       │
       ▼
[2] Agent polling SNMP máy in mỗi giờ (bộ đếm tổng số trang, v.v.)
       │
       ▼
[3] Gửi bộ đếm đến /api/snmp/ingest (xác thực bằng token)
       │
       ▼
[4] Lưu SnmpReading vào DB (S/N + timestamp + giá trị bộ đếm)
       │
       ▼
[5] Cron 02:00 KST ngày 1 hàng tháng: workflow 6 bước phiếu xác nhận sử dụng
        ① Tính chênh lệch bộ đếm tháng trước
        ② So sánh với Item.expectedYield
        ③ Tính tỷ lệ phù hợp → lưu YieldAnalysis
        ④ Gán YieldBadge
        ⑤ Khi nghi ngờ gian lận, gửi cảnh báo cho ADMIN (tự động dịch 3 ngôn ngữ)
        ⑥ Tạo PDF → lưu vào /admin/usage-confirmations
       │
       ▼
[6] Gửi PDF qua Portal khách hàng (hoặc email) → đính kèm hóa đơn
```

## Quản lý token

- Cấp phát: `/admin/snmp` → `[+ Cấp Agent]` → 1 token cho mỗi khách hàng. Chỉ hiển thị 1 lần khi cấp (không thể tra cứu lại).
- Thu hồi: `[Revoke]` → đóng dấu `tokenRevokedAt` ngay lập tức. Agent sẽ nhận phản hồi 401.
- Cấp lại: Sau khi thu hồi, nhấn `[+ Cấp lại]` → token mới. Cần chuyển cho khách hàng.

## Tự động cập nhật Agent

- `/api/snmp/agent-version` trả về URL của file `.exe` mới nhất từ GitHub Releases.
- Agent so sánh khi khởi động / mỗi ngày một lần → nếu có phiên bản mới, tải về và tự động khởi động lại.

## Xử lý ngoại lệ

| Tình huống | Hành động hệ thống | Hành động quản trị viên |
|---|---|---|
| Agent mất liên lạc 24 giờ | Cảnh báo (`SNMP_AGENT_OFFLINE`) | Hướng dẫn khách hàng khởi động lại PC |
| Bộ đếm bị lùi (≤ giá trị trước) | Bỏ qua reading + ghi log | Nghi ngờ thay máy in / firmware |
| Tháng trước có 0 dữ liệu | Bỏ qua phiếu xác nhận sử dụng | Yêu cầu khách hàng báo cáo thủ công |

---

# Bổ sung 2 — Phân tích tỷ lệ phù hợp vật tư tiêu hao (`/admin/yield-analysis`)

## Khái niệm cốt lõi

So sánh **số trang in thực tế** (bộ đếm SNMP) với **số trang in định mức** (`Item.expectedYield`) của từng hộp mực → tính **tỷ lệ phù hợp** (yieldRate).

```
Tỷ lệ phù hợp = (Số trang in thực tế) / (Số trang in định mức × hệ số yieldCoverageBase) × 100%
```

| Tỷ lệ phù hợp | Badge | Ý nghĩa |
|---|---|---|
| ≥ 90% | 🔵 BLUE | Rất tốt (sử dụng bình thường) |
| 70~89% | 🟢 GREEN | Tốt |
| 50~69% | 🟡 YELLOW | Cần lưu ý |
| 30~49% | 🟠 ORANGE | Cảnh báo |
| < 30% | 🔴 RED | **Nghi ngờ gian lận** — tự động cảnh báo ADMIN |

> **Công thức toner màu** (cyan + magenta + yellow tiêu hao đồng thời): 1 trang = C+M+Y mỗi thứ 1 tờ → khi tính tỷ lệ phù hợp dùng `MIN(sum_C, sum_M, sum_Y)`.

## Bảng điều khiển 4 tab

| Tab | Mục đích |
|---|---|
| **Tổng quan** | Nhóm theo hợp đồng + tỷ lệ phù hợp trung bình |
| **Nghi ngờ gian lận** | Chỉ lọc badge RED. Có thể đánh dấu đã điều tra |
| **Thống kê theo kỹ thuật viên** | Mở rộng trong tương lai — hiện tại theo khách hàng |
| **Cài đặt** | Điều chỉnh ngưỡng (BLUE/GREEN/YELLOW/ORANGE). Phải duy trì giảm đơn điệu |

## Thay đổi ngưỡng

`/admin/yield-analysis` → tab **Cài đặt** → thanh trượt hoặc nhập trực tiếp. Khi lưu, sẽ áp dụng từ kỳ cron hàng tháng tiếp theo.

> Ngưỡng phải **giảm đơn điệu** (BLUE > GREEN > YELLOW > ORANGE > 0). Vi phạm sẽ bị từ chối lưu.

## Workflow nghi ngờ gian lận

1. Cron ngày 1 hàng tháng tự động phát hiện RED.
2. Gửi `NotificationType.YIELD_FRAUD_SUSPECT` đến tất cả ADMIN (3 ngôn ngữ).
3. `/admin/yield-analysis` → tab **Nghi ngờ gian lận** → mở rộng dòng → kiểm tra lịch sử bộ đếm.
4. Sau khi điều tra, nhấn `[Hoàn tất điều tra]` → ghi lại `fraudReviewedAt` + `fraudReviewNote`.

---

# Bổ sung 3 — Vận hành Portal khách hàng (Phase A·B·C·D)

## Tổng quan 4 Phase

| Phase | Màn hình | Ý nghĩa |
|---|---|---|
| **A** | `/admin/portal-points` | Điểm Portal — tự động tích lũy theo doanh số + điều chỉnh thủ công |
| **B** | `/admin/portal-banners` | Banner Portal — văn bản 3 ngôn ngữ + lịch trình hình ảnh |
| **C** | `/admin/portal-posts` | Bài đăng Portal — AI tạo bản nháp + duyệt rồi phát hành |
| **D** | `/admin/feedback` + `/admin/surveys` + `/admin/referrals` | Ý kiến khách hàng · khảo sát · giới thiệu khách hàng |

## Phase C — Tự động tạo bài đăng AI

- Cron `/api/jobs/portal-news-generate` chạy tự động vào **09:00 KST thứ Hai**.
- Truyền dữ liệu doanh thu, thống kê tỷ lệ phù hợp, khách hàng mới, v.v. cho Claude API.
- Tạo đồng thời bản nháp 3 ngôn ngữ (VI/EN/KO) → lưu vào tab `draft`.
- Quản trị viên kiểm tra rồi nhấn `[Phát hành]` → hiển thị trên Portal khách hàng.

## Vận hành Phase D

- **Ý kiến khách hàng** (`/admin/feedback`): Ý kiến 1 dòng do khách hàng gửi từ Portal. Có thể gắn nhãn danh mục · mức độ quan trọng rồi đưa vào nghị trình cuộc họp.
- **Khảo sát** (`/admin/surveys`): Khảo sát định kỳ như NPS hàng quý. Tỷ lệ phản hồi + xu hướng điểm số.
- **Giới thiệu khách hàng** (`/admin/referrals`): Khách hàng mới do khách hàng cũ giới thiệu. Khi có khoản thanh toán đầu tiên, người giới thiệu được nhận điểm.

---

# Bổ sung 4 — Bảng chân trị 4 trục tồn kho (chuyên sâu cho quản trị viên)

Tham chiếu mục 6.2 của `A-supplement-2026-05.md`, bổ sung những điều quản trị viên cần biết:

## ClientRuleOverride

Có thể **ghi đè một số dòng của BASE_RULES** đối với một khách hàng cụ thể.

```sql
-- Ví dụ: Đối với khách hàng ABC, sau khi sửa chữa thuê ngoài và thu hồi, không tự động tạo ứng viên matching mua vào.
INSERT INTO "ClientRuleOverride" (clientId, referenceModule, overrideJson)
VALUES ('client_abc', 'REPAIR', '{"autoPurchaseCandidate": false}');
```

Giao diện UI sẽ được bổ sung sau. Hiện tại sửa trực tiếp trong DB.

## Quy trình thay đổi bảng chân trị

1. Sửa đối tượng `BASE_RULES` trong `src/lib/inventory-rules.ts`.
2. Khi mở rộng kiểu `SubKind`, thêm nhãn combo i18n.
3. Cập nhật `COMBOS_BY_TYPE` trong `transaction-new-form.tsx`.
4. Bổ sung logic gợi ý tại `/api/inventory/sn/[sn]/state`.
5. Thêm kịch bản test E2E (`scripts/test-inv-e2e.ts`).

> Khi thêm rule, **autoPurchaseCandidate / autoSalesCandidate** sẽ kích hoạt việc tự động tạo PR DRAFT. Bắt buộc kiểm tra luồng kế toán.

---

# Bổ sung 5 — Khóa sổ kế toán (`/admin/closings`)

## Hành vi khóa sổ

Khóa đồng loạt 4 loại record theo từng tháng (`YYYY-MM`):

| Đối tượng khóa | Hiệu ứng |
|---|---|
| `Sales` | Chặn sửa · xóa doanh thu |
| `Purchase` | Chặn sửa · xóa mua vào |
| `InventoryTransaction` | Chặn sửa · xóa nhập xuất |
| `PayableReceivable` | Chặn sửa · xóa khoản phải thu/phải trả |

Mỗi record được tự động đóng dấu `lockedAt = now()`, `lockReason = "Khóa sổ kế toán YYYY-MM"`.

## Mở khóa

Về nguyên tắc không thể mở khóa sau khi đã đóng. Tuy nhiên, trong trường hợp khẩn cấp, ADMIN có thể vào `/admin/closings` → tháng tương ứng → **[Mở khóa]** → `lockedAt = NULL`. Mọi thay đổi đều được ghi vào `audit_log`.

---

# Bổ sung 6 — Quản lý quyền (`/admin/permissions`)

## Dựa trên Role

| Role | Ý nghĩa |
|---|---|
| `ADMIN` | Toàn bộ hệ thống (có thể tra cứu tích hợp giữa các công ty) |
| `MANAGER` | Tất cả module trong công ty |
| `EMPLOYEE` | Dữ liệu của bản thân + một phần module trong phòng ban |
| `CLIENT` | Chỉ dùng Portal khách hàng (xác thực riêng) |

## allowedCompanies

Cột `allowedCompanies` của mỗi người dùng:
- `["TV"]` hoặc `["VR"]` → chỉ truy cập công ty tương ứng
- `["TV","VR"]` → có thể tra cứu tích hợp (hiển thị nút ALL trên sidebar)

Khi chuyển công ty, mọi truy vấn SQL sẽ tự động chèn `WHERE company_code = :session`.

---

# Bổ sung 7 — Nhật ký kiểm toán (`/admin/audit-logs`)

## Đối tượng tự động ghi

INSERT / UPDATE / DELETE của tất cả các bảng nghiệp vụ:
- Bảng nào, dòng nào (`record_id`)
- Giá trị trước thay đổi (`before` JSON)
- Giá trị sau thay đổi (`after` JSON)
- Ai (`user_id`), khi nào (`createdAt`), công ty nào (`company_code`)

## Tìm kiếm / Bộ lọc

- Tên bảng / khoảng thời gian / người dùng / mã công ty.
- Tự động hiển thị diff (before vs after, có màu sắc).

---

# Bổ sung 8 — Thùng rác (`/admin/trash`)

## Chính sách khôi phục 7 ngày

Tất cả record đã bị xóa mềm được lưu trong thùng rác **7 ngày**. Sau 7 ngày sẽ tự động xóa vĩnh viễn (ở kỳ cron tiếp theo).

| Hành động | Quyền |
|---|---|
| Khôi phục (`Restore`) | ADMIN |
| Xóa vĩnh viễn ngay lập tức | ADMIN (bỏ qua chờ 7 ngày) |
| Tự động xóa sau 7 ngày | Cron hệ thống (01:00 KST hàng ngày) |

## Lưu ý khi khôi phục

- Tự động kiểm tra ràng buộc khóa ngoại. Nếu record cha đã bị xóa vĩnh viễn, sẽ từ chối khôi phục.
- Ghi lại `restored_at` trong `audit_log`.

---

# Bổ sung 9 — Workflow doanh thu Mock

Công cụ tự động tạo doanh thu để test / demo.

| Bước | Hành động |
|---|---|
| ① Chọn hợp đồng IT | Một trong các hợp đồng đang hoạt động |
| ② Chọn tháng | Tháng phát sinh doanh thu |
| ③ Tự động áp đơn giá | Đơn giá thân máy + vật tư tiêu hao |
| ④ Tạo Mock Sales | Giao dịch `OUT/TRADE/SALE/COMPANY` + dòng Sales |

Doanh thu được tạo sẽ ghi vào audit log với cờ `mock=true`. Khuyến nghị dọn dẹp trước khi khóa sổ kế toán.

---

# Bổ sung 10 — Quản lý tài khoản Portal khách hàng

## Luồng tự động tạo

Khi nhập `email` vào master `Client` → tự động khi lưu:
1. Tạo mật khẩu tạm (token dùng 1 lần).
2. Gửi email Welcome (3 ngôn ngữ).
3. Bắt buộc đổi mật khẩu khi đăng nhập lần đầu.

## Access token / Session

- Đăng nhập Portal → cookie `tts_session` (tách biệt với ERP công ty).
- Hết hạn sau 24 giờ. Khi hết hạn cần đăng nhập lại.
- Khi mất mật khẩu, ADMIN bấm nút `[Reset]` để cấp lại.

---

# Bổ sung 11 — Mô tả tình trạng hiện tại của tồn kho (mô tả tự do)

`InventoryItem.stateNoteVi/En/Ko` + `stateNoteOriginalLang` — ghi chú tình trạng hiện tại theo từng S/N.

## Thời điểm nhập

- Nhập cùng lúc khi thay đổi trạng thái (NEEDS_REPAIR, v.v.) trên màn hình tồn kho.
- Ghi chú kết quả sau khi điều phối AS.
- Kết quả kiểm tra hàng tháng.

## Tự động dịch

Khi lưu, Claude API dịch ngay sang 2 ngôn ngữ còn lại. Tự động hiển thị theo ngôn ngữ người dùng đã chọn.

---

# Phụ lục (Quản trị viên) — Mục lục bổ sung

| Viết tắt/Thuật ngữ | Ý nghĩa |
|---|---|
| **AGENT_OFFLINE** | Cảnh báo SNMP Agent mất liên lạc 24h |
| **CRON** | Tác vụ chạy định kỳ (cron expression) |
| **fraudReviewedAt** | Thời điểm hoàn tất điều tra nghi ngờ gian lận |
| **HMR** | Hot Module Replacement (chế độ phát triển) |
| **SnmpReading** | Mô hình lưu 1 bản ghi bộ đếm SNMP |
| **softDelete** | Xóa vĩnh viễn sau khi giữ trong thùng rác 7 ngày |
| **YieldAnalysis** | Mô hình kết quả phân tích tỷ lệ phù hợp hàng tháng |
| **YieldConfig** | Mô hình cấu hình ngưỡng |
| **mock=true** | Cờ đánh dấu doanh thu Mock |

---

# Lịch sử thay đổi (Sổ tay quản trị viên v2 bản bổ sung)

- **v2.6.1 · 2026-05-03**: Tồn kho Phase 2 E2E 31/31 PASS + tách scripts/seed-inventory-e2e.ts + vá i18n field.fromWarehouse/toWarehouse. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.6.0 · 2026-05-03**: Tài chính Layer 5 — AccountingConfig (preset VAS/K_IFRS/IFRS) + chia nhóm sidebar 3 phần (Quỹ/Sổ cái/BCTC) + script E2E 21 bước (21/21 PASS). Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.5.0 · 2026-05-03**: Tài chính Layer 4 — Báo cáo tài chính (Cân đối thử/PL/BS/CF) + Đóng kỳ (verify→close→reopen) + AccountMonthlyBalance, hợp nhất /admin/closings. Sidebar +4 mục, Excel·In. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.4.0 · 2026-05-03**: Tài chính Layer 3 — Sổ cái kế toán (VAS ChartOfAccounts + JournalEntry/Line + AccountMapping). 5 hook bút toán tự động cho Bán hàng/Mua hàng/Cash/Expense/Payroll, 3 màn hình mới (Hệ thống tài khoản · Bút toán · Ánh xạ), thêm 3 mục sidebar. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.3.2 · 2026-05-03**: Vá đồng loạt 14 hạng mục thiếu của Layer 1·2 — chọn tài khoản trong modal thanh toán PR, quy trình duyệt hoàn ứng Expense (lọc theo trạng thái + badge + nút [Duyệt hoàn ứng]), nút thao tác Thu/Chi/Chuyển khoản theo từng dòng tài khoản, cron cuối tháng (`/api/jobs/finance-monthly-snapshot` — tạo BankAccountMonthlySnapshot + cộng dồn Budget actualAmount + thông báo vượt ngân sách), kiểm tra toàn vẹn (`/api/finance/bank-accounts/integrity-check` so sánh số dư cache vs tính toán), cảnh báo thiếu tiền (phát thông báo `CASH_SHORTAGE_ALERT`), xuất Excel báo cáo lợi nhuận, thêm 2 enum NotificationType. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.3.1 · 2026-05-03**: Tăng cường giao diện Expense — bù phần thiếu của tác vụ 13 Layer 1 (hiển thị các trường paymentMethod, vendor, targetClient, cashOut).
- **v2.3.0 · 2026-05-03**: Layer 2 Tài chính — Quản lý chi phí (CostCenter + AllocationRule + Budget + Lợi nhuận theo KH). Thêm 2 mục sidebar. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.2.0 · 2026-05-03**: Module Layer 1 Tài chính — Quản lý ngân quỹ (BankAccount/CashTransaction + Tăng cường Expense + Payroll bulk-pay + cron cảnh báo thiếu tiền). Thêm 3 mục vào sidebar nhóm Tài chính. Chi tiết tại Phụ lục K của Sách hướng dẫn nhân viên.
- **v2.1.2 · 2026-05-03**: Bổ sung fallback `resolveSessionCompanyCode()` trong Prisma extension — khi ALS rỗng, đọc trực tiếp header `x-session-user` để xác định `companyCode`. Khắc phục trường hợp `enterWith` của v2.1.1 không hoạt động vì RSC fork ngữ cảnh.
- **v2.1.1 · 2026-05-03**: Sửa bộ lọc công ty tự động cho Server Component — `getSession()` thiết lập ngữ cảnh ALS sticky. Đường server component bị bỏ sót ở v2.1.0 nay cũng tự lọc.
- **v2.1.0 · 2026-05-03**: Triển khai `companyCode` toàn diện — thêm cột vào 34 model dữ liệu nghiệp vụ (`@default(TV)` để backfill bản ghi cũ). Set `COMPANY_SCOPED_MODELS` trong `src/lib/prisma.ts` tự động lọc/chèn theo công ty. `CodeSequence` đổi sang PK phức hợp `(companyCode, key)` để tách chuỗi TNV/VNV (chống race). Thêm index `@@index([companyCode, createdAt])` đồng loạt. Master (Client/Item/Warehouse) + bảng hệ thống (File/User/AuditLog) không áp dụng (dùng chung). Bảng con (SalesItem/PurchaseItem/AsDispatchPart …) được điền qua propagate từ bảng cha.
- **v2.0.0 · 2026-05-02 (chiều)**: Thiết lập 4 quy tắc commit — ① tạo mới `src/lib/version.ts` + hiển thị ở đầu sidebar (dưới logo TTS) ② cập nhật đồng thời 3 ngôn ngữ ③ đồng bộ lịch sử thay đổi trong sách hướng dẫn ④ bắt buộc kiểm tra Chrome. Vi phạm sẽ phải làm lại trong lần kế tiếp.
- **2026-05-02 (sáng)**: Phát hành bản bổ sung này.
- **2026-05-01**: Bảng chân trị 4 trục 30→34 dòng, itemType SUPPLIES, các combo hoàn trả mua vào / hủy bỏ / điều chỉnh tồn kho / tháo lắp.
- **Cuối 2026-04**: ClientRuleOverride, tự động PR DRAFT, bài đăng Portal AI, workflow SNMP 6 bước + PDF.
- **Giữa 2026-04**: Nhãn NIIMBOT B21, quét QR đa lần, badge kênh màu sắc.
- **Đầu 2026-04**: 4 tab tỷ lệ phù hợp + cảnh báo nghi ngờ gian lận, tự động cấp tài khoản Portal khách hàng.
