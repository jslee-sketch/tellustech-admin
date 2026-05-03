// 기본 알림 규칙 — 시드. companyCode 별로 TV/VR 각각 적용.

export type DefaultRule = {
  eventType: string;
  targetType: "INDIVIDUAL" | "TEAM" | "ROLE" | "ALL" | "ASSIGNEE" | "ASSIGNEE_MANAGER" | "CLIENT_PIC";
  targetRoleId?: string;
  channelEmail: boolean;
  channelZalo: boolean;
  channelChat: boolean;
  templateKo: string;
  templateVi: string;
  templateEn: string;
};

export const DEFAULT_RULES: DefaultRule[] = [
  // 직원 업무
  { eventType: "AS_TICKET_ASSIGNED", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "AS 티켓 {ticketCode} 배정\n거래처: {clientName}\n증상: {symptom}",
    templateVi: "Phiếu AS {ticketCode} được giao\nKhách hàng: {clientName}\nTriệu chứng: {symptom}",
    templateEn: "AS Ticket {ticketCode} assigned\nClient: {clientName}\nSymptom: {symptom}" },

  { eventType: "AS_DISPATCH_COMPLETED", targetType: "ASSIGNEE_MANAGER", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "AS 출동 완료 — {ticketCode}\n거래처: {clientName}\n결과: {result}",
    templateVi: "Hoàn thành xuất phát AS — {ticketCode}\nKhách hàng: {clientName}\nKết quả: {result}",
    templateEn: "AS Dispatch completed — {ticketCode}\nClient: {clientName}\nResult: {result}" },

  { eventType: "SALES_FINANCE_CFM_REQUEST", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "매출 재경 확인 요청\n{salesCode} — {clientName}\n금액: {amount}₫",
    templateVi: "Yêu cầu xác nhận tài chính\n{salesCode} — {clientName}\nSố tiền: {amount}₫",
    templateEn: "Finance confirmation request\n{salesCode} — {clientName}\nAmount: {amount}₫" },

  { eventType: "SALES_FINANCE_CFM_DONE", targetType: "CLIENT_PIC", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "재경 CFM 완료\n{salesCode} — {clientName}",
    templateVi: "Đã xác nhận tài chính\n{salesCode} — {clientName}",
    templateEn: "Finance confirmed\n{salesCode} — {clientName}" },

  { eventType: "EXPENSE_REIMBURSE_REQUEST", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "경비 환급 요청\n{employeeName}: {amount}₫\n{description}",
    templateVi: "Yêu cầu hoàn trả chi phí\n{employeeName}: {amount}₫\n{description}",
    templateEn: "Expense reimbursement request\n{employeeName}: {amount}₫\n{description}" },

  { eventType: "EXPENSE_REIMBURSE_APPROVED", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "✅ 경비 환급 승인\n금액: {amount}₫\n{description}",
    templateVi: "✅ Đã duyệt hoàn ứng\nSố tiền: {amount}₫\n{description}",
    templateEn: "✅ Reimbursement approved\nAmount: {amount}₫\n{description}" },

  { eventType: "SCHEDULE_ASSIGNED", targetType: "ASSIGNEE", channelEmail: false, channelZalo: true, channelChat: true,
    templateKo: "📅 일정 배정\n{title}\n일시: {dueAt}",
    templateVi: "📅 Lịch được giao\n{title}\nThời gian: {dueAt}",
    templateEn: "📅 Schedule assigned\n{title}\nDue: {dueAt}" },

  // 마감/기한
  { eventType: "RECEIVABLE_DUE_D7", targetType: "ASSIGNEE", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "미수금 예정일 7일 전\n{clientName}: {amount}₫\n예정일: {dueDate}",
    templateVi: "Công nợ đến hạn sau 7 ngày\n{clientName}: {amount}₫\nNgày đến hạn: {dueDate}",
    templateEn: "Receivable due in 7 days\n{clientName}: {amount}₫\nDue: {dueDate}" },

  { eventType: "RECEIVABLE_DUE_D3", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "⚠️ 미수금 예정일 3일 전\n{clientName}: {amount}₫\n예정일: {dueDate}",
    templateVi: "⚠️ Công nợ đến hạn sau 3 ngày\n{clientName}: {amount}₫\nNgày đến hạn: {dueDate}",
    templateEn: "⚠️ Receivable due in 3 days\n{clientName}: {amount}₫\nDue: {dueDate}" },

  { eventType: "RECEIVABLE_OVERDUE", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "🔴 미수금 연체!\n{clientName}: {amount}₫\n예정일: {dueDate} (D+{overdueDays})",
    templateVi: "🔴 Công nợ quá hạn!\n{clientName}: {amount}₫\nNgày hạn: {dueDate} (D+{overdueDays})",
    templateEn: "🔴 Receivable overdue!\n{clientName}: {amount}₫\nDue: {dueDate} (D+{overdueDays})" },

  { eventType: "PAYABLE_DUE_D3", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "미지급금 예정일 3일 전\n{vendorName}: {amount}₫\n예정일: {dueDate}",
    templateVi: "Phải trả đến hạn sau 3 ngày\n{vendorName}: {amount}₫\nNgày: {dueDate}",
    templateEn: "Payable due in 3 days\n{vendorName}: {amount}₫\nDue: {dueDate}" },

  { eventType: "CONTRACT_EXPIRY_D30", targetType: "ASSIGNEE", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "계약 만료 30일 전\n{contractCode} — {clientName}\n만료일: {expiryDate}",
    templateVi: "Hợp đồng hết hạn sau 30 ngày\n{contractCode} — {clientName}\nNgày hết hạn: {expiryDate}",
    templateEn: "Contract expires in 30 days\n{contractCode} — {clientName}\nExpiry: {expiryDate}" },

  { eventType: "CONTRACT_EXPIRY_D7", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "⚠️ 계약 만료 7일 전\n{contractCode} — {clientName}\n만료일: {expiryDate}",
    templateVi: "⚠️ Hợp đồng hết hạn sau 7 ngày\n{contractCode} — {clientName}\nNgày hết hạn: {expiryDate}",
    templateEn: "⚠️ Contract expires in 7 days\n{contractCode} — {clientName}\nExpiry: {expiryDate}" },

  { eventType: "LICENSE_EXPIRY", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "라이선스 만료 임박\n{licenseName} — {expiryDate}",
    templateVi: "Giấy phép sắp hết hạn\n{licenseName} — {expiryDate}",
    templateEn: "License expires soon\n{licenseName} — {expiryDate}" },

  { eventType: "ACCOUNTING_CLOSE_REMINDER", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "📒 회계 마감 리마인더\n대상 월: {yearMonth}\n마감 권장일: {recommendedDate}",
    templateVi: "📒 Nhắc nhở đóng kỳ kế toán\nKỳ: {yearMonth}\nNgày khuyến nghị: {recommendedDate}",
    templateEn: "📒 Accounting close reminder\nPeriod: {yearMonth}\nRecommended: {recommendedDate}" },

  // 고객 관련
  { eventType: "PORTAL_AS_REQUEST", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "🔧 고객 AS 요청\n{clientName}: {equipmentName}\n증상: {symptom}",
    templateVi: "🔧 Yêu cầu AS từ khách hàng\n{clientName}: {equipmentName}\nTriệu chứng: {symptom}",
    templateEn: "🔧 Customer AS Request\n{clientName}: {equipmentName}\nSymptom: {symptom}" },

  { eventType: "PORTAL_SUPPLY_REQUEST", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "📦 고객 소모품 요청\n{clientName}: {itemName} × {quantity}",
    templateVi: "📦 Yêu cầu vật tư từ khách hàng\n{clientName}: {itemName} × {quantity}",
    templateEn: "📦 Customer Supply Request\n{clientName}: {itemName} × {quantity}" },

  { eventType: "PORTAL_QUOTE_REQUEST", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "💬 견적 요청\n{clientName}: {quoteType}\n예산: {budget}",
    templateVi: "💬 Yêu cầu báo giá\n{clientName}: {quoteType}\nNgân sách: {budget}",
    templateEn: "💬 Quote request\n{clientName}: {quoteType}\nBudget: {budget}" },

  { eventType: "PORTAL_FEEDBACK", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "📝 고객 피드백 — {kind}\n{clientName}\n{summary}",
    templateVi: "📝 Phản hồi khách hàng — {kind}\n{clientName}\n{summary}",
    templateEn: "📝 Customer feedback — {kind}\n{clientName}\n{summary}" },

  { eventType: "USAGE_CFM_COMPLETED", targetType: "ASSIGNEE_MANAGER", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "✅ 사용량 확인 완료\n{clientName} — {billingMonth}\n금액: {totalAmount}₫",
    templateVi: "✅ Xác nhận sản lượng hoàn tất\n{clientName} — {billingMonth}\nSố tiền: {totalAmount}₫",
    templateEn: "✅ Usage confirmation done\n{clientName} — {billingMonth}\nAmount: {totalAmount}₫" },

  { eventType: "USAGE_CFM_NO_RESPONSE_D3", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "⏰ 사용량 CFM 미응답 D+3\n{clientName} — {billingMonth}",
    templateVi: "⏰ Khách hàng chưa xác nhận sản lượng (D+3)\n{clientName} — {billingMonth}",
    templateEn: "⏰ Usage CFM no response (D+3)\n{clientName} — {billingMonth}" },

  { eventType: "PORTAL_REFERRAL", targetType: "ASSIGNEE", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "🎁 업체 추천 접수\n추천처: {referrerName} → 신규 {newClientName}",
    templateVi: "🎁 Giới thiệu khách hàng\n{referrerName} → {newClientName}",
    templateEn: "🎁 Referral received\n{referrerName} → {newClientName}" },

  // 부정/이상
  { eventType: "YIELD_FRAUD_SUSPECT_EVENT", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "🔴 소모품 적정율 이상 감지\n{serialNumber} ({clientName})\n적정율: {yieldRate}%",
    templateVi: "🔴 Phát hiện bất thường hiệu suất vật tư\n{serialNumber} ({clientName})\nTỷ lệ: {yieldRate}%",
    templateEn: "🔴 Consumable yield anomaly\n{serialNumber} ({clientName})\nRate: {yieldRate}%" },

  { eventType: "CASH_SHORTAGE_ALERT_EVENT", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: true, channelChat: true,
    templateKo: "⚠️ 자금 부족 예측\n{accountName}: 현재 {currentBalance}₫",
    templateVi: "⚠️ Dự báo thiếu tiền\n{accountName}: Hiện tại {currentBalance}₫",
    templateEn: "⚠️ Cash shortage forecast\n{accountName}: Current {currentBalance}₫" },

  { eventType: "AGENT_DISCONNECTED", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "📡 SNMP 에이전트 미접속\n{clientName} — 마지막 접속: {lastSeen}",
    templateVi: "📡 SNMP Agent mất kết nối\n{clientName} — Lần cuối: {lastSeen}",
    templateEn: "📡 SNMP agent disconnected\n{clientName} — Last seen: {lastSeen}" },

  { eventType: "TOKEN_EXPIRY_SOON", targetType: "ROLE", targetRoleId: "ADMIN", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "🔑 토큰 만료 임박 (D-{daysLeft})\n{tokenName}",
    templateVi: "🔑 Token sắp hết hạn (D-{daysLeft})\n{tokenName}",
    templateEn: "🔑 Token expires soon (D-{daysLeft})\n{tokenName}" },

  { eventType: "WEEKLY_MEETING_REMINDER", targetType: "ALL", channelEmail: false, channelZalo: false, channelChat: true,
    templateKo: "📋 주간 회의 리마인더 — {meetingTime}",
    templateVi: "📋 Nhắc nhở họp tuần — {meetingTime}",
    templateEn: "📋 Weekly meeting reminder — {meetingTime}" },

  { eventType: "PORTAL_POINTS_EXPIRY_SOON", targetType: "ASSIGNEE", channelEmail: true, channelZalo: false, channelChat: true,
    templateKo: "⏳ 고객 포인트 만료 임박\n{clientName}: {totalExpiring}d (가장 이른 만료: {firstExpireAt})",
    templateVi: "⏳ Điểm khách hàng sắp hết hạn\n{clientName}: {totalExpiring}d (sớm nhất: {firstExpireAt})",
    templateEn: "⏳ Client points expiring soon\n{clientName}: {totalExpiring}d (earliest: {firstExpireAt})" },
];
