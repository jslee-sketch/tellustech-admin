# Bản bổ sung Sổ tay Tellustech ERP (v2 · 2026-05)

> Tài liệu này thay thế hoàn toàn **Phần 6 Tồn kho** của `A-employee-manual.md` và bổ sung thêm các phụ lục (F~J). Phản ánh chính xác luồng nhập/xuất kho sau khi tái thiết kế hoàn toàn dựa trên bảng chân trị hơn 30 dòng.

---

# Phần 6. Tồn kho (Viết lại hoàn toàn)

Module tồn kho gồm 4 màn hình.

| Màn hình | Đường dẫn | Công dụng |
|---|---|---|
| **Tình trạng tồn kho** | `/inventory/stock` | Số lượng tồn theo mặt hàng · kho + chi tiết từng S/N¹ |
| **Đăng ký nhập/xuất** | `/inventory/transactions/new` | Tất cả kịch bản IN / OUT / TRANSFER |
| **Quét QR** | `/inventory/scan` | Tích lũy nhiều S/N qua camera rồi đăng ký hàng loạt |
| **In nhãn QR** | `/inventory/labels` | Nhãn dọc 50×70mm cho NIIMBOT B21² |

> ¹ S/N = Serial Number (số sê-ri). Mã định danh duy nhất cho 1 tài sản (ví dụ: `TONER-BK-1777080756243-1`).
> ² NIIMBOT B21 = máy in nhãn nhiệt khổ 50mm. In giống nhau trên cả PC và di động.

## 6.1 Tình trạng tồn kho (`/inventory/stock`)

### Hai tab

| Tab | Ý nghĩa |
|---|---|
| **Tình trạng thời gian thực** | Ma trận mặt hàng × kho. Tổng `onHand` tức thời |
| **Chi tiết theo S/N** | Danh sách S/N hiện ra khi nhấp vào dòng nhóm. Chọn nhiều bằng checkbox → nút header `🏷 In nhãn (N tờ)` |

### Trạng thái master S/N (`InventoryStatus`)

| Trạng thái | Ý nghĩa | Xử lý |
|---|---|---|
| `NORMAL` | Bình thường — có thể xuất ngay | Sử dụng nguyên trạng |
| `NEEDS_REPAIR` | Cần sửa chữa | Gửi đi outsource bằng OUT/REPAIR/REQUEST |
| `PARTS_USED` | Đã dùng linh kiện | Sau khi tháo (SPLIT) thì archive thân máy còn lại |
| `IRREPARABLE` | Cần thanh lý | OUT/TRADE/OTHER (thanh lý) |

### Hiển thị tài sản bên ngoài

Bên phải S/N tự động hiện huy hiệu `🏷 Tài sản ngoài` (màu warning) + nhãn khách hàng chủ sở hữu. Đây là tài sản có `ownerType=EXTERNAL_CLIENT` (máy sửa chữa cho khách, máy demo outsource, v.v.).

---

## 6.2 Đăng ký nhập/xuất — Hướng dẫn từng trường hợp đầy đủ (`/inventory/transactions/new`)

### Khái niệm cốt lõi — Bảng chân trị 4 trục³

Mọi nhập/xuất kho đều được quyết định bởi tổ hợp **4 trục**:

```
( txnType  ×  referenceModule  ×  subKind  ×  ownerType ) → Quy tắc xử lý
   ↑              ↑                  ↑           ↑
  IN/OUT/      RENTAL·REPAIR·     REQUEST·    COMPANY/
  TRANSFER     CALIB·DEMO·        RETURN·     EXTERNAL_
               TRADE·CONSUMABLE   PURCHASE·   CLIENT
                                  SALE·BORROW·
                                  LEND·OTHER·
                                  CONSUMABLE·
                                  LOSS·SPLIT·ASSEMBLE
```

> ³ Bảng chân trị = đối tượng `BASE_RULES` trong `src/lib/inventory-rules.ts`. Hiện đã định nghĩa hơn 30 dòng. Người dùng không nhập trực tiếp 4 trục mà chọn **kịch bản combo** (bên dưới), 4 trục sẽ được xác định tự động.

### Bước 1 — Chọn loại giao dịch (`txnType`)

Bộ chọn ở trên cùng màn hình.

| Loại | Ý nghĩa | Nhập tiếp theo |
|---|---|---|
| **IN (Nhập)** | Vào kho công ty | Bắt buộc `toWarehouseId`. Thêm `clientId` nếu là tài sản ngoài |
| **OUT (Xuất)** | Ra khỏi kho công ty | Bắt buộc `fromWarehouseId` + `clientId` |
| **TRANSFER (Di chuyển)** | Chỉ thay đổi vị trí (nội bộ↔nội bộ hoặc bên ngoài↔bên ngoài) | Phân nhánh chế độ tự động (xem mục 1.5) |

### Bước 2 — Chọn kịch bản combo

Khi chọn loại giao dịch, bộ chọn thứ hai chỉ hiển thị **N combo khả dụng cho loại đó**.

#### Combo IN (tổng cộng 11 loại)

| Nhãn (KO) | Khóa bảng chân trị | masterAction⁴ | PR tự động⁵ | Ghi chú |
|---|---|---|---|---|
| Rental/Nhập/Kết thúc — Thu hồi rental nội bộ | `IN\|RENTAL\|RETURN\|COMPANY` | MOVE | — | Tài sản công ty đang ở ngoài quay về |
| Rental/Nhập/Mua — Mượn từ outsource | `IN\|RENTAL\|BORROW\|EXTERNAL_CLIENT` | NEW | Ứng viên mua | Đăng ký mới tài sản ngoài |
| Repair/Nhập/Yêu cầu — Khách yêu cầu sửa chữa | `IN\|REPAIR\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | Nhập tài sản của khách |
| Repair/Nhập/Mua — Thu hồi sau sửa chữa ngoài | `IN\|REPAIR\|RETURN\|*` | MOVE | (Nội bộ) Ứng viên mua | Cả tài sản nội bộ và khách đều có thể |
| Calib/Nhập/Yêu cầu — Khách yêu cầu hiệu chuẩn | `IN\|CALIB\|REQUEST\|EXTERNAL_CLIENT` | NEW | — | 〃 |
| Calib/Nhập/Mua — Thu hồi sau hiệu chuẩn ngoài | `IN\|CALIB\|RETURN\|*` | MOVE | (Nội bộ) Ứng viên mua | 〃 |
| Demo/Nhập/Yêu cầu — Mượn từ bên ngoài | `IN\|DEMO\|BORROW\|EXTERNAL_CLIENT` | NEW | — | Nhập máy demo bên ngoài |
| Demo/Nhập/Kết thúc — Thu hồi máy demo nội bộ | `IN\|DEMO\|RETURN\|COMPANY` | MOVE | — | Máy demo nội bộ trở về |
| Mua hàng — Tài sản nội bộ mới | `IN\|TRADE\|PURCHASE\|COMPANY` | NEW | — | Được module Purchase gọi tự động |
| Điều chỉnh tồn kho — Phát hiện (kiểm kê thêm) | `IN\|TRADE\|OTHER\|COMPANY` | NEW | — | Phát hiện vật phẩm thực tế chưa có trên sổ khi kiểm kê |
| Lắp ráp — Thân máy mới (linh kiện OUT riêng) | `IN\|TRADE\|ASSEMBLE\|COMPANY` | NEW | — | Gộp N linh kiện → 1 thân máy |

> ⁴ **masterAction**: Hành động áp lên master InventoryItem.
>   - `NEW`: Tạo mới master
>   - `MOVE`: Cập nhật warehouseId (đổi kho nội bộ)
>   - `ARCHIVE`: Đóng dấu archivedAt (vô hiệu hóa)
>   - `TRANSFER_LOC`: Cập nhật currentLocationClientId (đánh dấu ủy thác bên ngoài)
>   - `NONE`: Master không thay đổi

> ⁵ **PR tự động** (PayableReceivable) = Ứng viên mua/bán. Tự động tạo ở trạng thái DRAFT (amount=0) để bộ phận tài chính xác nhận số tiền → nâng cấp lên OPEN.

#### Combo OUT (tổng cộng 14 loại)

| Nhãn (KO) | Khóa bảng chân trị | masterAction | PR tự động |
|---|---|---|---|
| Rental/Xuất/Trả lại — Trả về outsource | `OUT\|RENTAL\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| Rental/Xuất/Bán — Nội bộ → Khách | `OUT\|RENTAL\|LEND\|COMPANY` | TRANSFER_LOC | Ứng viên bán |
| Repair/Xuất/Yêu cầu — Ủy thác sửa chữa ngoài | `OUT\|REPAIR\|REQUEST\|*` | TRANSFER_LOC | — |
| Repair/Xuất/Bán — Trả khách + tính phí sửa chữa | `OUT\|REPAIR\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | Ứng viên bán |
| Calib/Xuất/Yêu cầu — Ủy thác hiệu chuẩn ngoài | `OUT\|CALIB\|REQUEST\|*` | TRANSFER_LOC | — |
| Calib/Xuất/Bán — Trả khách + tính phí hiệu chuẩn | `OUT\|CALIB\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | Ứng viên bán |
| Demo/Xuất/Yêu cầu — Nội bộ → Khách | `OUT\|DEMO\|LEND\|COMPANY` | TRANSFER_LOC | — |
| Demo/Xuất/Kết thúc — Trả lại bên ngoài | `OUT\|DEMO\|RETURN\|EXTERNAL_CLIENT` | ARCHIVE | — |
| Bán hàng — Xuất tài sản nội bộ | `OUT\|TRADE\|SALE\|COMPANY` | ARCHIVE | — (Phát hành từ module Sales) |
| Trả lại hàng mua — Trả về nhà cung cấp | `OUT\|TRADE\|RETURN\|COMPANY` | ARCHIVE | — |
| Thanh lý / Phế liệu | `OUT\|TRADE\|OTHER\|COMPANY` | ARCHIVE | — |
| Điều chỉnh tồn kho — Mất mát (thiếu khi kiểm kê) | `OUT\|TRADE\|LOSS\|COMPANY` | ARCHIVE | — |
| Tháo rời — Archive thân máy (linh kiện IN riêng) | `OUT\|TRADE\|SPLIT\|COMPANY` | ARCHIVE | — |
| Xuất vật tư tiêu hao (linh kiện AS⁶, v.v.) | `OUT\|CONSUMABLE\|CONSUMABLE\|COMPANY` | NONE | — |

> ⁶ AS = After-Service. Dịch vụ hậu mãi như sửa chữa, kiểm tra, thay vật tư cho thiết bị của khách hàng.

#### Combo TRANSFER (tổng cộng 5 loại — phân nhánh chế độ tự động)

| Nhãn (KO) | Khóa bảng chân trị | Chế độ | Nhập |
|---|---|---|---|
| **Di chuyển tồn kho nội bộ** (nội bộ ↔ nội bộ) | `TRANSFER\|TRADE\|OTHER\|COMPANY` | **Internal** | Cả `from/toWarehouseId` |
| Bên ngoài ↔ Bên ngoài (rental) | `TRANSFER\|RENTAL\|OTHER\|EXTERNAL_CLIENT` | **External** | Cả `from/toClientId` |
| Bên ngoài ↔ Bên ngoài (sửa chữa) | `TRANSFER\|REPAIR\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| Bên ngoài ↔ Bên ngoài (hiệu chuẩn) | `TRANSFER\|CALIB\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |
| Bên ngoài ↔ Bên ngoài (demo) | `TRANSFER\|DEMO\|OTHER\|EXTERNAL_CLIENT` | External | 〃 |

### Bước 3 — Phân nhánh ô nhập tự động theo kịch bản

Ngay khi chọn combo, **vùng nhập bổ sung** sẽ thay đổi tự động (cả tính hiển thị lẫn tính bắt buộc).

| Ô hiển thị | IN | OUT | TRANSFER (Internal) | TRANSFER (External) |
|---|---|---|---|---|
| Kho đến (`toWarehouseId`) | ✅ Bắt buộc | — | ✅ Bắt buộc | — |
| Kho đi (`fromWarehouseId`) | — | ✅ Bắt buộc | ✅ Bắt buộc | — |
| Khách hàng (`clientId`) | (Khi là tài sản ngoài) | ✅ Bắt buộc | — | — |
| Khách hàng đi (`fromClientId`) | — | — | — | ✅ Bắt buộc |
| Khách hàng đến (`toClientId`) | — | — | — | ✅ Bắt buộc |
| Ghi chú header (`note`) | Tùy chọn | Tùy chọn | Tùy chọn | Tùy chọn |

### Bước 4 — Đăng ký dòng (1 giao dịch = N dòng)

Thêm N mặt hàng cần đưa vào giao dịch dưới dạng danh sách thẻ (tối đa 1.000 dòng).

#### Các ô trên từng dòng và ràng buộc

| Ô | Ý nghĩa | Bắt buộc |
|---|---|---|
| Mặt hàng (`itemId`) | ItemCombobox | Luôn bắt buộc |
| S/N (`serialNumber`) | SerialCombobox | **Khác nhau theo itemType** (bên dưới) |
| Số lượng (`quantity`) | Số dương | Luôn bắt buộc (cố định 1 nếu có S/N) |
| S/N thiết bị đích (`targetEquipmentSN`) | Khi xuất vật tư tiêu hao: thiết bị nào nhận | Chỉ bắt buộc khi `subKind=CONSUMABLE` |
| Ghi chú dòng (`note`) | Tự do | Tùy chọn |

#### Tính bắt buộc của S/N — theo itemType

| itemType⁷ | Nhập S/N | Ghi chú |
|---|---|---|
| `PRODUCT` (sản phẩm) | **Bắt buộc** | Thân máy — 1 chiếc = 1 S/N |
| `CONSUMABLE` (vật tư tiêu hao) | **Bắt buộc** | Hộp mực toner, v.v. — 1 thùng khi mua = 1 S/N |
| `PART` (linh kiện) | **Bắt buộc** | Fuser/Drum, v.v. — 1 cái = 1 S/N |
| `SUPPLIES` (vật dụng) | Tùy chọn | Giấy A4, dụng cụ vệ sinh, v.v. — chỉ dùng số lượng |

> ⁷ itemType được xác định khi đăng ký mặt hàng (`/master/items`). SUPPLIES là loại thứ 4, được thêm vào tháng 2026-05.

#### Tháo rời/Lắp ráp — Nhiều dòng trong một giao dịch

- **Tháo rời**: Dòng 1 = thân máy OUT/TRADE/SPLIT (bắt buộc S/N). Dòng 2~N = linh kiện IN/TRADE/OTHER (đăng ký S/N mới cho từng linh kiện).
- **Lắp ráp**: Dòng 1 = thân máy IN/TRADE/ASSEMBLE (S/N mới). Dòng 2~N = linh kiện OUT/TRADE/OTHER.

> Ghi quan hệ cha-con vào ghi chú giao dịch để dễ truy vết.

### Bước 5 — Điều xảy ra khi lưu

```
[Lưu] click
  ↓
1. Kiểm tra header guard (sự tồn tại của kho/khách, chặn endpoint giống nhau, v.v.)
  ↓
2. Tra cứu bảng chân trị từng dòng (BASE_RULES[txnType|refModule|subKind|ownerType])
  ↓
3. Trong một prisma.$transaction({ timeout: 30s }) duy nhất:
   ① Tạo dòng InventoryTransaction
   ② Cập nhật InventoryItem theo masterAction
      - NEW       → INSERT master mới
      - MOVE      → Đổi warehouseId
      - ARCHIVE   → Đóng dấu archivedAt
      - TRANSFER_LOC → Đổi currentLocationClientId/SinceAt
   ③ autoPurchaseCandidate / autoSalesCandidate → Tự tạo PayableReceivable DRAFT (truy vết ngược qua sourceInventoryTxnId)
  ↓
4. Phản hồi: { count: N }
```

---

## 6.3 Quét QR đa S/N (`/inventory/scan`)

Bật scanner, quét liên tục nhiều S/N → tích lũy → quyết định header rồi đăng ký hàng loạt.

### Luồng

```
[📷 Khởi động camera (tab overlay)]
  ↓ Quét S/N (1 lần/giây, cooldown 1.5 giây, tự chặn SN trùng)
  ↓
1 lần quét = gọi /api/inventory/sn/{sn}/state
  ↓ Phân loại trạng thái master:
     NEW / OWN_IN_STOCK / OWN_AT_EXTERNAL /
     EXTERNAL_IN_STOCK / EXTERNAL_AT_VENDOR / ARCHIVED
  ↓ Tự động đề xuất kịch bản (4~7 lựa chọn theo trạng thái)
  ↓ Quét đầu tiên: Tự prefil txnType + comboKey + kho/khách hàng
  ↓
Scanner im lặng → Người dùng xem xét, chỉnh sửa kịch bản combo
  ↓
[Lưu] → Đăng ký hàng loạt qua /api/inventory/transactions/bulk
```

### Kịch bản đề xuất theo trạng thái master

| Trạng thái | Combo đề xuất |
|---|---|
| **NEW** (chưa có trong DB) | IN/RENTAL/BORROW · IN/REPAIR/REQUEST · IN/CALIB/REQUEST · IN/DEMO/BORROW · IN/TRADE/PURCHASE |
| **OWN_IN_STOCK** | OUT/RENTAL/LEND · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST · OUT/DEMO/LEND · OUT/TRADE/SALE · OUT/TRADE/RETURN · OUT/TRADE/OTHER · TRANSFER/TRADE/OTHER |
| **OWN_AT_EXTERNAL** | IN/RENTAL/RETURN · IN/REPAIR/RETURN · IN/CALIB/RETURN · IN/DEMO/RETURN |
| **EXTERNAL_IN_STOCK** | OUT/REPAIR/RETURN · OUT/CALIB/RETURN · OUT/RENTAL/RETURN · OUT/DEMO/RETURN · OUT/REPAIR/REQUEST · OUT/CALIB/REQUEST |
| **EXTERNAL_AT_VENDOR** | IN/REPAIR/RETURN · IN/CALIB/RETURN |
| **ARCHIVED** | (Không có đề xuất — tài sản đã vô hiệu hóa) |

### Hướng dẫn UX

- **Nhấp nháy xanh + rung 60ms** = Nhận dạng thành công. Quét lại cùng SN không có phản hồi (dedupe có chủ đích).
- **✕ trong danh sách** = Loại bỏ ngay mục bị quét nhầm.
- **Khi kịch bản thay đổi giữa chừng** Các mục cũ vẫn được giữ nguyên, đăng ký theo kịch bản mới.

---

## 6.4 In nhãn QR (`/inventory/labels`)

Quy cách dọc 50×70mm duy nhất. 1 nhãn = 1 trang. In trực tiếp từ PC hoặc lưu PNG trên di động.

### Cấu trúc nhãn

```
┌──────────────────────┐  50mm
│                      │
│       ███QR███       │  44mm × 44mm (vuông, giữa trên)
│       ███████        │
│       ███████        │
│                      │
├──────────────────────┤
│ ITM-XXX  [C] [TLS]   │  itemCode + Huy hiệu màu⁸ + Huy hiệu sở hữu⁹
│ Item Name            │  itemName (bold)
│ S/N: XXX-YY-ZZZZ     │  S/N (mono)
│ WH-A · Kho chính     │  Vị trí/nguồn (small)
└──────────────────────┘  70mm
```

> ⁸ Huy hiệu màu = Hiển thị channel toner (K=BLACK·đen, C=CYAN·lục lam, M=MAGENTA·đỏ tươi, Y=YELLOW·vàng, D=DRUM·trống mực, F=FUSER·bộ sấy). In nguyên bản khi dùng giấy in màu, OS tự chuyển sang grayscale khi in trắng đen.

> ⁹ Huy hiệu sở hữu: `[TLS]` = Tài sản nội bộ (Tellustech), `[EX]` = Tài sản ngoài (nền đen + chữ trắng).

### Cài đặt hộp thoại in (Bắt buộc)

Trong hộp thoại in của OS, **phải** đặt các giá trị sau:
- Máy in: NIIMBOT B21 (hoặc Chrome '🅿 Lưu thành PDF')
- Khổ giấy: **Tùy chỉnh 50×70mm dọc**
- Lề: **Không có**
- Tỷ lệ: **100%**

> Nếu chọn A4/Letter, nhãn sẽ in nhỏ ở góc và có thể thêm trang trắng. Hướng dẫn luôn hiển thị trong hộp vàng phía trên màn hình.

### Sử dụng trên di động

Biểu tượng `📸` từng dòng hoặc nút `📸 Lưu toàn bộ PNG` → Lưu PNG 200dpi → Mở từ thư viện ảnh để gọi in qua app NIIMBOT hoặc lệnh in của hệ thống.

### Chế độ prefil URL (4 cách)

| Truy vấn | Ý nghĩa |
|---|---|
| `?sns=SN1,SN2,...` | Nhiều S/N — Tự động tra cứu mọi thông tin từ master |
| `?items=ITM1,ITM2,...` | Nhiều ID mặt hàng — itemCode·itemName·colorChannel |
| `?purchaseId=...` | 1 đơn mua — Header nhà cung cấp/số đơn mua + tất cả dòng |
| `?itemCode=&sn=` | Đơn lẻ (tương thích legacy) |

---

# Phụ lục F — Sơ đồ luồng ERP (Hướng dẫn 1 trang)

## F.1 Luồng dữ liệu giữa các module

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Khách hàng  │     │  Mặt hàng   │     │   Kho        │
│ /master/    │     │ /master/    │     │ /master/    │
│ clients     │     │ items       │     │ warehouses  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           ▼
        ┌──────────────────────────────────┐
        │  InventoryItem (Master S/N)      │
        │   ┌─ ownerType (COMPANY/EXT)     │
        │   ├─ warehouseId (Kho hiện tại)  │
        │   ├─ currentLocationClientId     │
        │   │   (Vị trí ủy thác ngoài)     │
        │   └─ archivedAt                  │
        └─────┬───────────┬──────────┬─────┘
              │           │          │
        IN/OUT/         Cập nhật    Đổi trạng thái
        TRANSFER        vị trí       tài sản
              │           │          │
              ▼           ▼          ▼
   ┌───────────────────────────────────────────────────┐
   │  InventoryTransaction (Dựa trên rule 4 trục)      │
   │   txnType × refModule × subKind × ownerType        │
   │   → Quyết định masterAction + autoPurchase/Sales   │
   └────┬───────────────┬─────────────┬─────────────────┘
        │               │             │
   Ứng viên mua    Ứng viên bán    Cập nhật master
        ▼               ▼             ▼
   ┌────────┐    ┌────────┐    ┌──────────┐
   │ Purchase│    │ Sales  │    │Vị trí/   │
   │ DRAFT   │    │ DRAFT  │    │trạng thái│
   │         │    │        │    │tự đổi    │
   └────┬───┘    └────┬───┘    └──────────┘
        │             │
   Tài chính       Tài chính
   xác nhận        xác nhận
        ▼             ▼
   ┌────────┐    ┌────────┐
   │Phải trả │    │Phải thu│
   └────────┘    └────────┘
```

## F.2 Luồng truy vết S/N

Cách 1 S/N được liên kết xuyên suốt toàn hệ thống:

```
                S/N (vd: TONER-BK-1777080756243-1)
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
  InventoryItem      InventoryTransaction   ItContractEquipment
  (1 dòng - master)  (N dòng - lịch sử)     (Nếu đã đăng ký vào hợp đồng)
       │                  │                  │
       │                  ▼                  │
       │           PayableReceivable          │
       │           (Ứng viên mua/bán)         │
       │                                     │
       ▼                                     ▼
  Hiển thị nhãn QR                      Hợp đồng IT (`/rental/it-contracts`)
  (`?sns=...`)                          + Lịch sử Amendment
       │                                     │
       ▼                                     ▼
   /inventory/scan                      Lập hóa đơn · quyết toán hàng tháng
   Đề xuất theo trạng thái              (Billing tháng)
```

**Cốt lõi**: Chỉ cần biết S/N, qua `/inventory/scan` hoặc `?sns=` một lần là tra được toàn bộ lịch sử của tài sản đó (chủ sở hữu, vị trí, hợp đồng đang hoạt động, mua/bán, nhãn).

---

# Phụ lục G — Tóm tắt chức năng chính (1 trang)

## Master
- **Khách hàng** (`/master/clients`) — Tích hợp nhà cung cấp · khách hàng bán · nhà thầu phụ. `clientCode` tự động (`CL-YYMMDD-###`).
- **Mặt hàng** (`/master/items`) — 4 itemType (PRODUCT/CONSUMABLE/PART/**SUPPLIES**), BOM cha-con, ánh xạ tương thích, channel màu.
- **Kho** (`/master/warehouses`) — INTERNAL (nội bộ) / EXTERNAL (nhà thầu phụ).
- **Nhân viên** (`/master/employees`) — Mã nhân viên tự động theo công ty (`TNV-###` / `VNV-###`).
- **Phòng ban · Dự án · Lịch · License** — Master phụ trợ.

## Bán hàng
- **Bán hàng** (`/sales`) — Tự động xuất TRADE. Bắt buộc S/N. Tự tạo ứng viên bán PR.
- **Mua hàng** (`/purchases`) — Tự động nhập TRADE. Tạo master NEW.
- **Yêu cầu báo giá** (`/admin/quotes`) — Thư ngỏ ý của khách → chuyển thành đơn bán.
- **Điều chỉnh · Hoàn tiền** — Sales/Purchase Adjustments. Trả hàng · đổi · xử lý từng phần.

## Rental
- **Hợp đồng IT** (`/rental/it-contracts`) — Ánh xạ đơn giá tự động cho thân máy + vật tư tiêu hao. Lịch sử Amendment.
- **TM Rental** (`/rental/tm-rentals`) — Cho thuê ngắn hạn. `rentalCode = TM-YYMMDD-###`.
- **Thu thập SNMP tự động** — Windows Agent + xác thực token → PDF xác nhận sử dụng.
- **Tỷ lệ phù hợp vật tư** (`/admin/yield-analysis`) — So sánh sản lượng định mức với thực tế, cảnh báo nghi ngờ gian lận.

## A/S
- **Tiếp nhận ticket** (`/as/tickets`) — Yêu cầu khách + đính kèm ảnh.
- **Điều phối** (`/as/dispatches`) — Xuất quân + sử dụng linh kiện + truy vết S/N.

## Tồn kho (Chương này)
- Tình trạng tồn kho · Nhập/xuất · Quét QR · Nhãn QR — Dựa trên bảng chân trị 4 trục.

## Nhân sự
- Nhập việc · Nghỉ việc · Đánh giá sự kiện · Đánh giá định kỳ · Phép năm · Lương.

## Tài chính
- Phải thu/Phải trả (Workflow PR DRAFT → OPEN → PARTIAL → PAID).
- CFM tài chính bán hàng, đóng sổ kế toán, chi phí.

## Họp · Lịch · Nhắn tin
- Lịch, chat (tự động dịch 3 ngôn ngữ).

## Vận hành cổng khách hàng
- Điểm cổng · Banner · Bài đăng (AI tự động sinh thứ Hai 09:00 KST).
- Ý kiến khách · Khảo sát · Đề xuất nhà cung cấp.

## Thống kê (`/stats`)
- Dashboard KPI theo từng module.

## Quản trị
- Audit log · Quản lý quyền · Thùng rác.

---

# Phụ lục H — Bảng thuật ngữ (Glossary · theo bảng chữ cái)

| Thuật ngữ | Giải thích |
|---|---|
| **Bảng chân trị 4 trục** | Bảng quy tắc xác định hành vi nhập/xuất bằng khóa (txnType × referenceModule × subKind × ownerType). Đối tượng `BASE_RULES`. |
| **AS** | After-Service. Dịch vụ hậu mãi cho khách (sửa chữa · thay vật tư, v.v.). |
| **AUTO PR DRAFT** | Dòng PayableReceivable tự sinh dưới dạng ứng viên mua/bán. Bản nháp với amount=0 → tài chính xác nhận số tiền. |
| **Amendment** | Lịch sử thay đổi hợp đồng IT (thêm/đổi/gỡ thiết bị). Có thể tự sinh khi đăng ký nhập/xuất. |
| **archivedAt** | Thời điểm vô hiệu hóa master. Có giá trị khác NULL sau khi bán/trả/thanh lý tài sản. |
| **BASE_RULES** | Đối tượng bảng chân trị trong `src/lib/inventory-rules.ts`. Hơn 30 dòng. |
| **BOM** | Bill of Materials. Quan hệ mặt hàng cha — mặt hàng con. |
| **CFM** | Confirm. Bước xác nhận bán hàng/lịch. |
| **CL-YYMMDD-###** | Mã tự động cho khách hàng. |
| **ColorChannel** | Channel toner (BLACK/CYAN/MAGENTA/YELLOW/DRUM/FUSER/NONE). Hiển thị qua huy hiệu màu trên nhãn. |
| **COMPANY** | OwnerType — Tài sản nội bộ. |
| **CONSUMABLE** | itemType — Vật tư tiêu hao (toner, v.v.). Hoặc sub-kind của OUT. |
| **CRUD** | Create/Read/Update/Delete. 4 thao tác dữ liệu cơ bản. |
| **currentLocationClientId** | ID khách hàng nơi tài sản đang ủy thác bên ngoài. NULL khi thu hồi. |
| **DEMO** | refModule — Trình diễn máy demo. |
| **DRAFT** | Trạng thái khởi đầu của PR. amount=0 → OPEN khi tài chính xác nhận. |
| **ECOUNT** | ERP cũ. Dùng XLSX export khi di chuyển. |
| **EX** | External. Huy hiệu tài sản ngoài trên nhãn. Nền đen + chữ trắng. |
| **EXTERNAL_CLIENT** | OwnerType — Tài sản bên ngoài (khách · nhà thầu phụ). |
| **fromClientId** | Khách hàng đi của chế độ TRANSFER External. |
| **fromWarehouseId** | Kho đi của chế độ OUT hoặc TRANSFER Internal. |
| **i18n** | Internationalization. Xử lý đa ngôn ngữ. ERP này dùng 3 ngôn ngữ vi/en/ko. |
| **IN** | txnType — Nhập kho. |
| **inboundReason** | Lý do nhập được ghi vào master (legacy enum). |
| **InventoryItem** | Bảng master, 1 S/N tương ứng 1 dòng. |
| **InventoryTransaction** | Bản ghi giao dịch nhập/xuất (event log). |
| **IRREPARABLE** | InventoryStatus — Cần thanh lý. |
| **Hợp đồng IT** | Hợp đồng cho thuê thiết bị IT như máy photocopy, máy in. `TLS-YYMMDD-###`. |
| **itemType** | 4 loại PRODUCT/CONSUMABLE/PART/**SUPPLIES**. |
| **JSON** | JavaScript Object Notation. Định dạng trao đổi dữ liệu. |
| **KST** | Korea Standard Time (UTC+9). |
| **lockedAt** | Thời điểm đóng sổ kế toán. Không thể thay đổi nếu khác NULL. |
| **MOVE** | masterAction — Đổi kho nội bộ. |
| **NEW** | masterAction — Tạo mới master. |
| **NIIMBOT B21** | Máy in nhãn nhiệt khổ 50mm. |
| **NORMAL** | InventoryStatus — Bình thường. |
| **OFF-YYMMDD-###** | Mã tự động cho nghỉ việc. |
| **ON BORROW** | Mượn từ bên ngoài DEMO/RENTAL. |
| **ONB-YYMMDD-###** | Mã tự động cho nhập việc. |
| **onHand** | Cột số lượng tồn trong tình trạng tồn kho. |
| **OUT** | txnType — Xuất kho. |
| **ownerClientId** | ID khách hàng chủ sở hữu của tài sản EXTERNAL_CLIENT. |
| **ownerType** | COMPANY / EXTERNAL_CLIENT. |
| **PARTS_USED** | InventoryStatus — Đã dùng linh kiện (sau tháo rời). |
| **PayableReceivable (PR)** | Bảng tích hợp phải trả/phải thu. |
| **PartialAmendment** | Sửa đổi một phần hợp đồng IT. |
| **PNG** | Portable Network Graphics. Định dạng lưu nhãn trên di động. |
| **prefill** | Hành vi form được điền tự động qua truy vấn URL hoặc kết quả quét QR. |
| **REPAIR** | refModule — Sửa chữa. |
| **RENTAL** | refModule — Cho thuê. |
| **S/N** | Serial Number. 1 tài sản = 1 S/N. Khóa của toàn hệ thống. |
| **scenarioId** | Định danh dòng bảng chân trị (1~28). |
| **SNMP** | Simple Network Management Protocol. Tự động thu thập bộ đếm máy in. |
| **SUPPLIES** | itemType — Vật dụng (dựa trên số lượng, S/N tùy chọn). |
| **TLS** | Huy hiệu nhãn tài sản nội bộ Tellustech. |
| **TM Rental** | Cho thuê ngắn hạn. Mã tự động TM-YYMMDD-###. |
| **toClientId** | Khách hàng đến của chế độ TRANSFER External. |
| **toWarehouseId** | Kho đến của chế độ IN hoặc TRANSFER Internal. |
| **TRADE** | refModule — Tích hợp mua/bán/trả/thanh lý/lắp ráp/tháo rời. |
| **TRANSFER** | txnType — Di chuyển (nội bộ↔nội bộ hoặc bên ngoài↔bên ngoài). |
| **TRANSFER_LOC** | masterAction — Cập nhật vị trí ủy thác bên ngoài. |
| **txnType** | InventoryTransaction.txnType (IN/OUT/TRANSFER). |
| **YieldBadge** | Huy hiệu tỷ lệ phù hợp (BLUE/GREEN/YELLOW/ORANGE/RED). |

---

# Phụ lục I — Bảng viết tắt

| Viết tắt | Diễn giải |
|---|---|
| **AS** | After-Service |
| **BOM** | Bill of Materials |
| **CFM** | Confirm |
| **CRUD** | Create/Read/Update/Delete |
| **DRAFT** | Trạng thái ban đầu của PayableReceivable |
| **ERP** | Enterprise Resource Planning |
| **EX** | External (bên ngoài) |
| **HMR** | Hot Module Replacement (dành cho phát triển) |
| **IT** | Information Technology |
| **JSON** | JavaScript Object Notation |
| **KST** | Korea Standard Time |
| **OAuth** | Open Authorization |
| **PR** | PayableReceivable |
| **PDF** | Portable Document Format |
| **PNG** | Portable Network Graphics |
| **QR** | Quick Response (code) |
| **RFC** | Request For Comments (tiêu chuẩn Internet) |
| **S/N** | Serial Number |
| **SNMP** | Simple Network Management Protocol |
| **SSO** | Single Sign-On |
| **TLS** | Tellustech (viết tắt nội bộ) |
| **TM** | Tellustech short-term rental |
| **TV** | Tellustech Vina (pháp nhân Việt Nam) |
| **VR** | Vietrental (pháp nhân Việt Nam) |
| **UI** | User Interface |
| **UX** | User Experience |
| **UTC** | Coordinated Universal Time |
| **XLSX** | Định dạng bảng tính Excel |

---

# Phụ lục J — FAQ · Câu hỏi thường gặp

### Q1. Tôi có thể chỉnh sửa giao dịch IN tự sinh từ module Mua hàng trực tiếp trong form nhập/xuất không?
**Không**. Giao dịch được tạo qua module Purchase chỉ có thể chỉnh sửa hoặc trả hàng tại màn hình Sales/Purchase Adjustments. Form nhập/xuất chỉ phụ trách đăng ký mới.

### Q2. Khi S/N bị đăng ký sai, làm sao để chỉnh sửa?
Có thể khôi phục trong vòng 7 ngày qua Thùng rác (`/admin/trash`) ở trang quản trị. Sau 7 ngày thì đăng ký lại với S/N mới qua IN/TRADE/OTHER (Điều chỉnh tồn kho - Phát hiện).

### Q3. Khi tài sản bên ngoài (hàng sửa của khách) ở trong kho chúng tôi thì có phát sinh khoản phải trả không?
**Không**. Sẽ được đăng ký với `ownerType=EXTERNAL_CLIENT` và không tự sinh PR (ứng viên mua). Chúng tôi chỉ lưu giữ.

### Q4. Sau khi tháo rời, có thể lắp ráp lại các linh kiện không?
Được. Trong cùng giao dịch xử lý đồng thời N linh kiện qua OUT/TRADE/OTHER + thân máy qua IN/TRADE/ASSEMBLE. Tuy nhiên, hệ thống không tự truy vết quan hệ cha-con, nên khuyến nghị ghi vào ghi chú giao dịch.

### Q5. Nhãn in ra nhỏ trên 1 trang A4.
Bạn chưa đổi khổ giấy trong hộp thoại in của OS sang khổ tùy chỉnh 50×70mm dọc. Hãy làm theo hộp hướng dẫn màu vàng ở phía trên màn hình.

### Q6. Sau khi quét QR thì cùng một nhãn cứ tiếp tục được thêm.
Trước đây có giai đoạn dedupe không hoạt động do bug. Từ sau 2026-05 đã được giải quyết bằng cooldown 1.5 giây + inflight guard + phản hồi nhấp nháy xanh.

### Q7. SUPPLIES (vật dụng) đăng ký ở đâu?
Chọn "Vật dụng (số lượng)" trong selectbox itemType tại `/master/items/new`. Cả mua hàng lẫn tồn kho đều chỉ dùng số lượng, không cần nhập S/N.

### Q8. Chuyển tài sản giữa hai pháp nhân (TV/VR) thì sao?
Xử lý bằng logic bán/mua hàng giữa các khách hàng. Đăng ký đồng thời TV → VR bán + VR → TV mua. Không có workflow riêng.

---

# Phụ lục K — Lịch sử thay đổi (Bản bổ sung 2026-05)

- **2026-05-02**: Phát hành bản bổ sung này. Viết lại hoàn toàn Phần 6 Tồn kho, thêm Phụ lục F~K.
- **2026-05-01**: Thêm itemType SUPPLIES (4 itemType), thêm chế độ TRANSFER Internal, thêm 4 dòng cho trả hàng mua/thanh lý/điều chỉnh tồn kho, bảng chân trị 30→34 dòng.
- **Cuối 2026-04**: Áp dụng bảng chân trị 4 trục, loại bỏ enum 16 giá trị của ECOUNT.
- **Giữa 2026-04**: Quy cách dọc đơn nhất 50×70mm cho nhãn NIIMBOT B21, huy hiệu channel màu, huy hiệu sở hữu EX/TLS.
- **Đầu 2026-04**: Quét QR đa S/N, đề xuất kịch bản theo trạng thái.
