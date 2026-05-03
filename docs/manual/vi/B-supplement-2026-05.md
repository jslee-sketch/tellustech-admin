# Tellustech ERP Sổ tay Quản trị viên — Bản bổ sung (v2 · 2026-05)

> Tài liệu này bổ sung hướng dẫn chuyên sâu cho các module cốt lõi (SNMP · tỷ lệ phù hợp · vận hành Portal · tồn kho) của `B-admin-manual.md`. Hãy xem cùng với bản bổ sung của sổ tay người dùng (`A-supplement` của `A-employee-manual.md`) để hiểu toàn bộ luồng vận hành.

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

- **2026-05-02**: Phát hành bản bổ sung này.
- **2026-05-01**: Bảng chân trị 4 trục 30→34 dòng, itemType SUPPLIES, các combo hoàn trả mua vào / hủy bỏ / điều chỉnh tồn kho / tháo lắp.
- **Cuối 2026-04**: ClientRuleOverride, tự động PR DRAFT, bài đăng Portal AI, workflow SNMP 6 bước + PDF.
- **Giữa 2026-04**: Nhãn NIIMBOT B21, quét QR đa lần, badge kênh màu sắc.
- **Đầu 2026-04**: 4 tab tỷ lệ phù hợp + cảnh báo nghi ngờ gian lận, tự động cấp tài khoản Portal khách hàng.
