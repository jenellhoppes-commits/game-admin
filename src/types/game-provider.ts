export type WalletMode = 'Seamless' | 'Transfer'

export type AgentLevel = 'L1' | 'L2' | 'L3'

export type AgentStatus = 'Draft' | 'Pending' | 'Active' | 'Disabled'

export type SettlementBasis = 'GGR' | 'Valid Bet' | 'Turnover'

export type SettlementCycle = 'Daily' | 'Weekly' | 'Semimonthly' | 'Monthly'

export type BusinessStatus =
  | 'Active'
  | 'Inactive'
  | 'Maintenance'
  | 'Pending'
  | 'Suspended'
  | 'Disabled'
  | 'Draft'
  | 'Configuring'
  | 'Sandbox Enabled'
  | 'Testing'
  | 'Production Pending'
  | 'Not Started'
  | 'Passed'
  | 'Failed'
  | 'Closed'
  | 'Terminated'
  | 'Published'
  | 'Risk'

export type MerchantStatus = 'Draft' | 'Pending' | 'Active' | 'Suspended' | 'Terminated'

export type MerchantLineStatus =
  | 'Draft'
  | 'Pending'
  | 'Configuring'
  | 'Sandbox Enabled'
  | 'Testing'
  | 'Production Pending'
  | 'Active'
  | 'Suspended'
  | 'Closed'

export type CredentialStatus =
  | 'Not Issued'
  | 'Active'
  | 'Testing'
  | 'Rotating'
  | 'Disabled'
  | 'Revoked'
  | 'Expired'

export type IntegrationEnvironment = 'Sandbox' | 'Production'

export interface CredentialRecord {
  id: string
  environment: IntegrationEnvironment
  apiKey: string
  fingerprint: string
  apiVersion: string
  signatureVersion: string
  status: CredentialStatus
  issuedAt?: string
  rotatedAt?: string
  expiresAt?: string
}

export interface IntegrationEnvironmentConfig {
  id: string
  environment: IntegrationEnvironment
  endpoint: string
  callbackUrl: string
  ipWhitelist: string[]
  status: 'Not Configured' | 'Configuring' | 'Testing' | 'Active' | 'Disabled'
  credential?: CredentialRecord
  updatedAt: string
}

export interface IntegrationTestItem {
  id: string
  name: string
  description: string
  required: boolean
  status: 'Not Started' | 'Testing' | 'Passed' | 'Failed'
  testedAt?: string
}

export interface AgentRecord {
  id: string
  code: string
  name: string
  level: AgentLevel
  parentAgentId?: string
  parentAgent: string
  childAgentCount: number
  merchantCount: number
  currency: string
  contact: string
  contactMethod?: string
  cooperationStartDate?: string
  note?: string
  status: AgentStatus
  createdAt: string
  updatedAt?: string
}

export interface GameTypeRate {
  typeId: string
  code: string
  name: string
  percent: number
}

export interface AgentCommercialTerm {
  settlementMode?: string
  gameTypeRates?: GameTypeRate[]
  autoEffective?: boolean
  id: string
  agentId: string
  version: number
  settlementBasis: SettlementBasis
  ratePercent: number
  settlementCurrency: string
  settlementCycle: SettlementCycle
  effectiveFrom: string
  effectiveTo?: string
  status: 'Draft' | 'Scheduled' | 'Active' | 'Expired' | 'Disabled'
  reason: string
  createdBy: string
  createdAt: string
}

export interface AgentReconciliationSummary {
  id: string
  agentId: string
  period: string
  settlementBasis: SettlementBasis
  betAmount: number
  winAmount: number
  ggr: number
  validBet: number
  ratePercent: number
  estimatedRevenue: number
  currency: string
  exchangeRateStatus: 'Estimated' | 'Locked'
  status: 'Pending' | 'Difference' | 'Confirmed' | 'Completed'
}

export interface MerchantLine {
  uid: string
  merchantId: string
  currency: string
  walletMode: WalletMode
  enabledGames: number
  limitPlanCount: number
  jackpotMode: 'Default' | 'Custom' | 'Excluded'
  environment: 'Not Configured' | 'Sandbox' | 'Production'
  credentialStatus: CredentialStatus
  environments: IntegrationEnvironmentConfig[]
  status: MerchantLineStatus
  updatedAt: string
}

export interface MerchantGameConfiguration {
  platformClosed?: boolean
  gameId: string
  merchantId: string
  enabled: boolean
  rtpPlanId: string
  rtpPlanName: string
  updatedAt: string
}

export interface MerchantLineGameConfiguration {
  gameId: string
  lineUid: string
  enabled: boolean
  rtpPlanName: string
  limitPlan: string
  jackpotMode: 'Default' | 'Custom' | 'Excluded'
  updatedAt: string
}

export interface MerchantRecord {
  /** Requested betting currency before any line is provisioned. */
  requestedCurrency?: string
  id: string
  code: string
  name: string
  brandName?: string
  agentId: string
  agentName: string
  walletMode: WalletMode
  country: string
  timezone: string
  contact: string
  email?: string
  cooperationStartDate?: string
  note?: string
  agentTermPercent: number
  merchantTermPercent: number
  settlementCurrency: string
  settlementCycle: 'Daily' | 'Weekly' | 'Semimonthly' | 'Monthly'
  status: MerchantStatus
  lines: MerchantLine[]
  createdAt: string
  updatedAt: string
}

export interface MerchantCommercialTerm {
  settlementMode?: string
  gameTypeRates?: GameTypeRate[]
  autoEffective?: boolean
  id: string
  merchantId: string
  version: number
  settlementBasis: SettlementBasis
  agentTermPercent: number
  merchantTermPercent: number
  settlementCurrency: string
  settlementCycle: SettlementCycle
  effectiveFrom: string
  effectiveTo?: string
  status: 'Draft' | 'Scheduled' | 'Active' | 'Expired' | 'Disabled'
  reason: string
  createdBy: string
  createdAt: string
}

export interface MerchantReconciliationSummary {
  id: string
  merchantId: string
  period: string
  settlementBasis: SettlementBasis
  betAmount: number
  winAmount: number
  ggr: number
  validBet: number
  merchantTermPercent: number
  estimatedSettlement: number
  currency: string
  exchangeRateStatus: 'Estimated' | 'Locked'
  status: 'Pending' | 'Difference' | 'Confirmed' | 'Completed'
}

export type FinanceReconciliationStatus =
  | 'Draft'
  | 'Pending Confirmation'
  | 'Difference'
  | 'Confirmed'
  | 'Locked'
  | 'Cancelled'

export type ReconciliationDifferenceStatus =
  | 'Open'
  | 'Investigating'
  | 'Waiting Partner'
  | 'Waiting Internal'
  | 'Resolved'
  | 'Accepted'
  | 'Closed'

export type ReconciliationDifferenceType =
  | 'Bet Amount'
  | 'Payout Amount'
  | 'Valid Bet'
  | 'Jackpot'
  | 'Refund'
  | 'Exchange Rate'
  | 'Fee'
  | 'Other'

export interface FinanceCalculationSnapshot {
  settlementBasis: SettlementBasis
  ratePercent: number
  transactionCurrency: string
  settlementCurrency: string
  exchangeRate: number
  exchangeRateSource: string
  exchangeRateSnapshotIds: string[]
  exchangeRateTime: string
  amountPrecision: number
  roundingRule: '四捨五入' | '無條件捨去' | '無條件進位' | '銀行家捨入'
  formulaVersion: string
  calculatedAt: string
}

export interface ReconciliationMetrics {
  previousAccumulatedAmount?: number
  settlementMode?: string
  memberCount: number
  betCount: number
  betAmount: number
  validBet: number
  payoutAmount: number
  jackpotContribution: number
  jackpotPayout: number
  cancelledAmount: number
  refundAmount: number
  ggr: number
  initialSettlementAmount: number
  adjustmentAmount: number
  finalSettlementAmount: number
  actualSettlementAmount?: number
  roundingAdjustment?: number
  confirmationNote?: string
}

export interface MerchantReconciliationRecord extends ReconciliationMetrics {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  merchantId: string
  merchantCode: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  currency: string
  differenceCount: number
  unresolvedDifferenceCount: number
  status: FinanceReconciliationStatus
  snapshot: FinanceCalculationSnapshot
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  lockedAt?: string
}

export interface AgentReconciliationRecord extends ReconciliationMetrics {
  id: string
  period: string
  periodStart: string
  periodEnd: string
  agentId: string
  agentCode: string
  agentName: string
  merchantCount: number
  currency: string
  differenceCount: number
  unresolvedDifferenceCount: number
  includedMerchantReconciliationIds: string[]
  status: FinanceReconciliationStatus
  snapshot: FinanceCalculationSnapshot
  createdAt: string
  updatedAt: string
  confirmedAt?: string
  lockedAt?: string
}

export interface ReconciliationDailyRow {
  date: string
  betCount: number
  betAmount: number
  validBet: number
  payoutAmount: number
  ggr: number
  settlementAmount: number
}

export interface ReconciliationGameRow {
  gameId: string
  gameCode: string
  gameName: string
  betCount: number
  validBet: number
  payoutAmount: number
  ggr: number
  settlementAmount: number
}

export interface ReconciliationDifferenceRecord {
  id: string
  reconciliationType: 'Merchant' | 'Agent'
  reconciliationId: string
  period: string
  merchantId?: string
  merchantName?: string
  agentId: string
  agentName: string
  lineUid?: string
  type: ReconciliationDifferenceType
  systemValue: number
  partnerValue: number
  differenceAmount: number
  currency: string
  status: ReconciliationDifferenceStatus
  assignee?: string
  description: string
  resolution?: string
  resolutionType?: 'Use System Value' | 'Use Partner Value' | 'Create Adjustment'
  relatedBetIds: string[]
  relatedTransactionIds: string[]
  detectedAt: string
  dueAt: string
  updatedAt: string
}

export interface FinanceActionLog {
  id: string
  entityType:
    | 'Merchant Reconciliation'
    | 'Agent Reconciliation'
    | 'Difference'
    | 'Settlement Batch'
    | 'Merchant Statement'
    | 'Agent Statement'
    | 'Exchange Snapshot'
    | 'Settlement Adjustment'
  entityId: string
  action: string
  before: string
  after: string
  reason: string
  operator: string
  time: string
}

export type SettlementBatchStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Processing'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'

export type SettlementStatementStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Paid' | 'Voided'

export type SettlementAdjustmentStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Rejected'
  | 'Applied'

export interface SettlementBatchRecord {
  id: string
  name: string
  period: string
  periodStart: string
  periodEnd: string
  cycle: SettlementCycle
  settlementCurrency: string
  merchantStatementCount: number
  agentStatementCount: number
  totalAmount: number
  adjustmentAmount: number
  finalAmount: number
  unresolvedDifferenceCount: number
  exchangeSnapshotCount: number
  status: SettlementBatchStatus
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
  completedAt?: string
}

export interface MerchantSettlementStatement {
  previousAccumulatedAmount?: number
  settlementMode?: string
  id: string
  batchId: string
  reconciliationId: string
  period: string
  merchantId: string
  merchantCode: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  transactionCurrency: string
  settlementCurrency: string
  exchangeRate: number
  grossAmount: number
  adjustmentAmount: number
  finalAmount: number
  status: SettlementStatementStatus
  dueDate: string
  createdAt: string
  paidAt?: string
}

export interface AgentSettlementStatement {
  previousAccumulatedAmount?: number
  settlementMode?: string
  id: string
  batchId: string
  reconciliationId: string
  period: string
  agentId: string
  agentCode: string
  agentName: string
  settlementCurrency: string
  merchantStatementCount: number
  grossAmount: number
  adjustmentAmount: number
  finalAmount: number
  status: SettlementStatementStatus
  dueDate: string
  createdAt: string
  paidAt?: string
}

export interface SettlementExchangeSnapshot {
  id: string
  batchId: string
  fromCurrency: string
  toCurrency: string
  rate: number
  source: string
  sourceRateSnapshotIds: string[]
  rateTime: string
  status: 'Estimated' | 'Locked'
  lockedBy?: string
  lockedAt?: string
}

export interface SettlementAdjustmentRecord {
  id: string
  batchId: string
  targetType: 'Merchant' | 'Agent'
  statementId: string
  targetId: string
  targetName: string
  type: 'Reconciliation Difference' | 'Manual' | 'Fee' | 'Compensation' | 'Other'
  direction: 'Credit' | 'Debit'
  currency: string
  amount: number
  reason: string
  evidence?: string
  status: SettlementAdjustmentStatus
  requester: string
  requestedAt: string
  reviewer?: string
  reviewedAt?: string
  appliedAt?: string
}

export interface AuditEntry {
  id: string
  action: string
  operator: string
  approver?: string
  reason: string
  time: string
  result: 'Success' | 'Pending' | 'Rejected'
  before?: string
  after?: string
}

export type MemberMerchantStatus = 'Active' | 'Inactive' | 'Blocked'

export type MemberRestrictionStatus = 'None' | 'Scheduled' | 'Active' | 'Expired'

export type MemberRiskStatus = 'Normal' | 'Attention' | 'High'

export type MemberTagKind = 'General' | 'Test' | 'Whitelist' | 'Watch' | 'Risk'

export interface MemberWalletSnapshot {
  balance: number
  availableBalance?: number
  frozenBalance?: number
  source: 'Merchant' | 'Game Wallet'
  updatedAt: string
}

export interface MemberTagRecord {
  id: string
  memberId: string
  tag: MemberTagKind
  reason: string
  note?: string
  operator: string
  createdAt: string
  removedAt?: string
  removalReason?: string
  status: 'Active' | 'Removed'
}

export interface MemberRestrictionRecord {
  id: string
  memberId: string
  scope: 'All Games'
  reason: string
  note?: string
  startAt: string
  endAt?: string
  status: 'Scheduled' | 'Active' | 'Expired' | 'Cancelled'
  operator: string
  createdAt: string
  releasedAt?: string
  releaseReason?: string
}

export interface MemberGameActivity {
  id: string
  memberId: string
  gameId: string
  gameName: string
  firstPlayedAt: string
  lastPlayedAt: string
  rounds: number
  betAmount: number
  payoutAmount: number
  status: 'Active' | 'Inactive'
}

export type MemberBetStatus = 'In Progress' | 'Settled' | 'Cancelled' | 'Refunded' | 'Exception'

export interface MemberBetRecord {
  id: string
  memberId: string
  roundId: string
  gameId: string
  gameName: string
  betAmount: number
  payoutAmount: number
  playerNet: number
  currency: string
  status: MemberBetStatus
  time: string
}

export type MemberTransactionType =
  | 'Bet'
  | 'Payout'
  | 'Refund'
  | 'Rollback'
  | 'Jackpot'
  | 'Transfer In'
  | 'Transfer Out'

export type MemberTransactionStatus =
  | 'Processing'
  | 'Success'
  | 'Failed'
  | 'Refunded'
  | 'Rolled Back'
  | 'Exception'

export interface MemberTransactionRecord {
  id: string
  memberId: string
  type: MemberTransactionType
  gameId?: string
  gameName?: string
  roundId?: string
  amount: number
  currency: string
  status: MemberTransactionStatus
  time: string
}

export interface MemberJackpotRecord {
  id: string
  memberId: string
  poolId: string
  poolName: string
  level: string
  gameId: string
  gameName: string
  amount: number
  currency: string
  roundId: string
  payoutAt: string
  status: 'Pending' | 'Paid' | 'Failed'
}

export interface MemberAnomalyRecord {
  id: string
  memberId: string
  type: string
  gameId?: string
  gameName?: string
  betId?: string
  transactionId?: string
  riskLevel: 'Low' | 'Medium' | 'High'
  occurredAt: string
  status: 'Open' | 'Investigating' | 'Resolved' | 'Dismissed'
  riskCaseId?: string
}

export interface BetResultSnapshot {
  resultType: 'Win' | 'Loss' | 'Pending' | 'Cancelled'
  outcome: string
  multiplier: number
  feature: string
  resultCode: string
  jackpotAmount: number
  summary: string
  version: BetVersionSnapshot
  replay: BetReplaySnapshot
  rawPayload: string
}

export type BetReplayStatus = 'Available' | 'Partial' | 'Unsupported' | 'Missing Data'

export interface BetVersionSnapshot {
  gameVersion: string
  resultFormatVersion: string
  rtpPlan: string
  limitPlan: string
  replayAssetVersion: string
}

export interface BetBoardCell {
  position: number
  row: number
  column: number
  symbolId: string
  symbolName: string
  icon: string
  winning: boolean
  winLineIds: string[]
}

export interface BetBoardStage {
  id: string
  sequence: number
  type: 'Base Game' | 'Cascade' | 'Free Game' | 'Bonus' | 'Respin' | 'Round End'
  label: string
  rows: number
  columns: number
  cells: BetBoardCell[]
  winMultiplier: number
  payoutAmount: number
  feature?: string
}

export type BetReplayEventType =
  | 'Bet'
  | 'Game Start'
  | 'Board Result'
  | 'Win Evaluation'
  | 'Feature'
  | 'Jackpot'
  | 'Payout'
  | 'Round End'

export interface BetReplayEvent {
  id: string
  sequence: number
  offsetSeconds: number
  type: BetReplayEventType
  title: string
  detail: string
  stageId?: string
  amount?: number
  currency?: string
  transactionId?: string
  riskAlert?: string
}

export interface BetReplaySnapshot {
  status: BetReplayStatus
  supportsBoardDisplay: boolean
  supportsResultReplay: boolean
  supportsEventReplay: boolean
  stages: BetBoardStage[]
  events: BetReplayEvent[]
}

export interface BetResultAccessLog {
  id: string
  betId: string
  action: 'View Board' | 'Start Replay' | 'View Raw Result' | 'Export Result'
  detail: string
  operator: string
  time: string
}

export interface BetCenterRecord extends MemberBetRecord {
  externalMemberId: string
  gameCode: string
  gameType: string
  merchantId: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  walletMode: WalletMode
  settledAt?: string
  transactionIds: string[]
  riskStatus: 'Normal' | 'Attention' | 'Exception'
  result: BetResultSnapshot
}

export interface TransactionHistoryEntry {
  id: string
  status: MemberTransactionStatus
  action: string
  note: string
  operator: string
  time: string
}

export interface TransactionCenterRecord extends MemberTransactionRecord {
  externalMemberId: string
  merchantId: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  walletMode: WalletMode
  betId?: string
  externalReference: string
  beforeBalance: number
  afterBalance: number
  completedAt?: string
  parentTransactionId?: string
  riskStatus: 'Normal' | 'Attention' | 'Exception'
  history: TransactionHistoryEntry[]
}

export type RiskAlertCategory =
  | 'Member'
  | 'Bet'
  | 'Transaction'
  | 'Merchant Line'
  | 'Game'
  | 'Jackpot'

export type RiskSeverity = 'Low' | 'Medium' | 'High' | 'Critical'

export type RiskAlertStatus =
  | 'New'
  | 'Acknowledged'
  | 'Investigating'
  | 'Resolved'
  | 'False Positive'
  | 'Dismissed'

export interface RiskRuleSummary {
  id: string
  code: string
  name: string
  category: RiskAlertCategory
  severity: RiskSeverity
  scope: string
  metric: string
  operator: '>' | '>=' | '<' | '<=' | '=' | '!='
  threshold: string
  window: string
  cooldown: string
  status: 'Draft' | 'Pending' | 'Scheduled' | 'Active' | 'Disabled' | 'Expired'
  todayTriggers: number
  description: string
  scopeTargets: string[]
  whitelist: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RiskAlertRecord {
  id: string
  title: string
  category: RiskAlertCategory
  severity: RiskSeverity
  score: number
  status: RiskAlertStatus
  ruleId: string
  ruleName: string
  source: string
  measuredValue: string
  threshold: string
  description: string
  subjectType: string
  subjectId: string
  subjectLabel: string
  memberId?: string
  externalMemberId?: string
  betId?: string
  transactionId?: string
  merchantId?: string
  merchantName?: string
  lineUid?: string
  gameId?: string
  gameName?: string
  poolId?: string
  poolName?: string
  replayEventId?: string
  replayStageId?: string
  assignee?: string
  caseId?: string
  occurredAt: string
  dueAt: string
  updatedAt: string
}

export interface RiskActionLog {
  id: string
  alertId: string
  action: string
  before: string
  after: string
  reason: string
  operator: string
  time: string
}

export type RiskCaseStatus = 'Open' | 'Investigating' | 'Pending Decision' | 'Resolved' | 'Closed'

export interface RiskCaseRecord {
  id: string
  title: string
  category: RiskAlertCategory
  severity: RiskSeverity
  status: RiskCaseStatus
  priority: 'Low' | 'Normal' | 'High' | 'Urgent'
  description: string
  alertIds: string[]
  memberIds: string[]
  betIds: string[]
  transactionIds: string[]
  merchantIds: string[]
  lineUids: string[]
  gameIds: string[]
  poolIds: string[]
  assignee?: string
  openedBy: string
  openedAt: string
  dueAt: string
  updatedAt: string
  conclusion?: string
  resolution?: string
  closedAt?: string
}

export interface RiskCaseActionLog {
  id: string
  caseId: string
  action: string
  before: string
  after: string
  reason: string
  operator: string
  time: string
}

export type ApprovalSourceType = 'Risk Rule' | 'Agent' | 'Merchant' | 'Game' | 'Jackpot'

export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export interface ApprovalChangeItem {
  field: string
  before: string
  after: string
  sensitive?: boolean
}

export interface ApprovalRecord {
  lineCurrency?: string
  createdLineUid?: string
  id: string
  title: string
  sourceType: ApprovalSourceType
  sourceId: string
  sourceName: string
  action: string
  summary: string
  priority: 'Normal' | 'High' | 'Urgent'
  status: ApprovalStatus
  requester: string
  requestedAt: string
  dueAt: string
  reviewer?: string
  reviewedAt?: string
  reviewReason?: string
  changes: ApprovalChangeItem[]
}

export interface ApprovalActionLog {
  id: string
  approvalId: string
  action: string
  before: string
  after: string
  reason: string
  operator: string
  time: string
}

export type JackpotStatus = 'Draft' | 'Pending' | 'Active' | 'Maintenance' | 'Disabled' | 'Closed'

export type JackpotType = 'Single Game' | 'Shared Games' | 'Campaign'

export interface JackpotPoolRecord {
  id: string
  code: string
  nameZh: string
  nameEn: string
  type: JackpotType
  baseCurrency: string
  timezone: string
  description: string
  note?: string
  currentBalance: number
  status: JackpotStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface JackpotLevelRecord {
  id: string
  poolId: string
  code: string
  name: string
  sort: number
  initialDisplayAmount: number
  minimumDisplayAmount: number
  currentBalance: number
  color: string
  status: 'Active' | 'Disabled'
  note?: string
  updatedAt: string
}

export interface JackpotGameBinding {
  id: string
  poolId: string
  gameId: string
  gameName: string
  gameType: string
  rtpPlan: string
  limitPlan: string
  status: 'Active' | 'Scheduled' | 'Disabled'
  effectiveAt: string
  updatedAt: string
}

export interface JackpotMerchantSetting {
  id: string
  poolId: string
  merchantId: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  currency: string
  walletMode: WalletMode
  displayName: string
  status: 'Active' | 'Scheduled' | 'Disabled'
  effectiveAt: string
  updatedAt: string
}

export type JackpotLedgerType =
  | 'Contribution'
  | 'Payout'
  | 'Refund'
  | 'Rollback'
  | 'System Adjustment'
  | 'Manual Adjustment'

export interface JackpotLedgerRecord {
  id: string
  poolId: string
  levelId: string
  levelName: string
  type: JackpotLedgerType
  memberId?: string
  externalMemberId?: string
  merchantId?: string
  merchantName?: string
  gameId?: string
  gameName?: string
  roundId?: string
  beforeBalance: number
  amount: number
  afterBalance: number
  currency: string
  status: 'Processing' | 'Success' | 'Failed' | 'Rolled Back'
  occurredAt: string
}

export type JackpotPayoutStatus =
  | 'Pending'
  | 'Processing'
  | 'Paid'
  | 'Failed'
  | 'Refunded'
  | 'Rolled Back'

export interface JackpotPayoutRecord {
  id: string
  poolId: string
  levelId: string
  levelName: string
  memberId: string
  externalMemberId: string
  merchantId: string
  merchantName: string
  gameId: string
  gameName: string
  roundId: string
  amount: number
  currency: string
  status: JackpotPayoutStatus
  transactionId?: string
  failureReason?: string
  payoutAt: string
}

export interface JackpotAuditRecord {
  id: string
  poolId: string
  action: string
  target: string
  before: string
  after: string
  reason: string
  operator: string
  approver?: string
  status: 'Success' | 'Pending' | 'Rejected'
  time: string
}

export interface MemberRecord {
  id: string
  externalId: string
  merchantId: string
  merchantName: string
  agentId: string
  agentName: string
  lineUid: string
  currency: string
  walletMode: WalletMode
  merchantStatus: MemberMerchantStatus
  restrictionStatus: MemberRestrictionStatus
  riskStatus: MemberRiskStatus
  tags: MemberTagKind[]
  latestGameId: string
  latestGameName: string
  firstPlayedAt: string
  lastPlayedAt: string
  createdAt: string
  wallet: MemberWalletSnapshot
}

export interface OverrideValue {
  systemDefault: string
  merchantOverride?: string
  currencyOverride?: string
  finalValue: string
}

export interface BusinessRecord {
  id: string
  code: string
  name: string
  category: string
  owner: string
  metric: string
  status: BusinessStatus
  updatedAt: string
}

export type ReportMode =
  | 'overview'
  | 'game-performance'
  | 'rtp'
  | 'merchant'
  | 'merchant-line'
  | 'agent'
  | 'agent-merchant'
  | 'member'
  | 'bet'
  | 'transaction'
  | 'jackpot'
  | 'merchant-settlement'
  | 'agent-settlement'

export type ReportRowStatus = 'Normal' | 'Attention' | 'Pending' | 'Completed'

export interface ReportMetricRow {
  id: string
  primary: string
  secondary?: string
  category?: string
  period?: string
  currency: string
  agentId?: string
  agentName?: string
  merchantId?: string
  merchantName?: string
  lineUid?: string
  gameId?: string
  gameName?: string
  memberId?: string
  memberName?: string
  betCount?: number
  transactionCount?: number
  rounds?: number
  activeMembers?: number
  merchantCount?: number
  betAmount?: number
  validBetAmount?: number
  payoutAmount?: number
  ggr?: number
  theoreticalRtp?: number
  actualRtp?: number
  rtpDeviation?: number
  successRate?: number
  jackpotContribution?: number
  jackpotPayout?: number
  currentBalance?: number
  adjustmentAmount?: number
  settlementAmount?: number
  status: ReportRowStatus
  updatedAt: string
}

export type GameTaxonomyKind = 'type' | 'feature' | 'marketing'

export type GameTaxonomyStatus = 'Active' | 'Disabled'

export type GameLimitModel =
  | 'Slot Bet Levels'
  | 'Fishing Hall BetX'
  | 'Arcade Level Currency'
  | 'Generic Bet Range'

export interface GameTaxonomyRecord {
  id: string
  kind: GameTaxonomyKind
  code?: string
  name: string
  displayText?: string
  limitModel?: GameLimitModel
  affectsSettings?: boolean
  relatedSetting?: string
  gameCount: number
  sort: number
  status: GameTaxonomyStatus
  note?: string
  updatedAt: string
}

export type GameStatus = 'Draft' | 'Active' | 'Maintenance' | 'Disabled'

export type GameSetupStatus = 'Configured' | 'Not Configured'

export type GamePlanStatus = 'Draft' | 'Active' | 'Disabled'

export interface GameRtpPlan {
  id: string
  gameId: string
  code: string
  name: string
  rtpValue: number
  configKey: string
  isDefault: boolean
  status: GamePlanStatus
  version: number
  note?: string
  updatedAt: string
}

export interface GameLimitPlan {
  id: string
  gameId: string
  code: string
  name: string
  currency: string
  model: GameLimitModel
  dimension: string
  minBet: number
  maxBet: number
  defaultBet?: number
  betLevels: number[]
  buyFeatureMax?: number
  superBuyMax?: number
  status: GamePlanStatus
  note?: string
  updatedAt: string
}

export interface GameAssetRecord {
  name: string
  mimeType: string
  size: number
  url: string
  width?: number
  height?: number
}

export interface GameRecord {
  id: string
  code: string
  icon: string
  iconAsset?: GameAssetRecord
  coverAsset?: GameAssetRecord
  heroAsset?: GameAssetRecord
  internalName: string
  displayName: string
  englishName: string
  typeId: string
  defaultLocale: string
  featureTagIds: string[]
  marketingTagIds: string[]
  defaultRtp?: number
  rtpPlanCount: number
  limitPlanCount: number
  rtpStatus: GameSetupStatus
  limitStatus: GameSetupStatus
  masterComplete: boolean
  merchantCount: number
  sort?: number
  note?: string
  description?: string
  orientation?: 'Landscape' | 'Portrait' | 'Responsive'
  supportedDevices?: string[]
  layout?: string
  payoutModel?: string
  ways?: string
  betMode?: string
  baseBetModel?: string
  maxWinMultiplier?: number
  volatility?: 'Low' | 'Medium' | 'High'
  supportsBoardDisplay?: boolean
  supportsResultReplay?: boolean
  supportsEventReplay?: boolean
  subgames?: Array<{
    code: string
    name: string
    featureType: string
    specialLimitRequired: boolean
  }>
  status: GameStatus
  updatedAt: string
}

export interface BusinessModuleDefinition {
  path: string
  title: string
  eyebrow: string
  description: string
  primaryAction: string
  codeLabel: string
  nameLabel: string
  categoryLabel: string
  ownerLabel: string
  metricLabel: string
  detailBase?: string
}

export type FinanceSettingStatus = 'Active' | 'Inactive'
export type ExchangeRateStatus = 'Draft' | 'Published' | 'Locked'
export type ExchangeSourceHealth = 'Normal' | 'Delayed' | 'Unavailable'
export type FinanceRoundingRule = '四捨五入' | '無條件捨去' | '無條件進位' | '銀行家捨入'
export type ExchangeAdjustmentMode = 'Add' | 'Subtract' | 'None'
export type ExchangeAdjustmentUnit = 'Percent' | 'Fixed'
export type ExchangeHistoryStatus = 'Success' | 'Failed' | 'Corrected'
export type ExchangeRateType = 'Market' | 'Pegged' | 'Manual'
export type CurrencyType = 'Fiat' | 'Crypto' | 'System'

export interface CurrencyConfigRecord {
  code: string
  name: string
  symbol: string
  numericCode: string
  currencyType: CurrencyType
  transactionEnabled: boolean
  settlementEnabled: boolean
  decimalPlaces: number
  minimumUnit: number
  status: FinanceSettingStatus
  sort: number
  updatedAt: string
}

export interface ExchangeRateSourceRecord {
  id: string
  name: string
  type: 'API' | 'Manual' | 'Internal'
  priority: number
  refreshMinutes: number
  status: FinanceSettingStatus
  health: ExchangeSourceHealth
  lastSyncedAt: string
}

export interface ExchangeRateConfigRecord {
  id: string
  fromCurrency: string
  toCurrency: string
  rateType: ExchangeRateType
  configuredRate?: number
  sourceId: string
  dailyFetchTime: string
  adjustmentMode: ExchangeAdjustmentMode
  adjustmentUnit: ExchangeAdjustmentUnit
  adjustmentValue: number
  precision: number
  roundingRule: FinanceRoundingRule
  effectiveVersion: string
  effectiveFrom: string
  status: FinanceSettingStatus
  todaySourceRate: number
  todayFinalRate: number
  lockedAt?: string
  updatedAt: string
}

export interface DailyExchangeRateRecord {
  id: string
  date: string
  fromCurrency: string
  toCurrency: string
  rateType?: ExchangeRateType
  baseRate: number
  adjustmentPercent: number
  adjustmentMode?: ExchangeAdjustmentMode
  adjustmentUnit?: ExchangeAdjustmentUnit
  adjustmentValue?: number
  finalRate: number
  sourceId: string
  status: ExchangeRateStatus
  fetchedAt?: string
  publishedAt?: string
  lockedAt?: string
  settingVersion?: string
  settlementUsed?: boolean
  settlementIds?: string[]
  fetchStatus?: ExchangeHistoryStatus
  failureReason?: string
  correctionNote?: string
  updatedAt: string
}

export interface ExchangeRateAlertRecord {
  id: string
  currencyPair: string
  thresholdPercent: number
  currentChangePercent: number
  status: 'Normal' | 'Triggered' | 'Acknowledged'
  enabled: boolean
  lastTriggeredAt?: string
  updatedAt: string
}

export interface ExchangeRateUpdateLog {
  id: string
  target: string
  action: string
  beforeValue: string
  afterValue: string
  operator: string
  createdAt: string
  note: string
}

export interface SettlementRuleConfig {
  defaultCurrency: string
  cycle: SettlementCycle
  rateTiming: 'Period End' | 'Settlement Day' | 'Daily Average' | 'Manual Snapshot'
  rateSourceId: string
  amountPrecision: number
  roundingRule: FinanceRoundingRule
  effectiveFrom: string
  status: FinanceSettingStatus
  updatedAt: string
}

export type PlatformAccountStatus = 'Active' | 'Locked' | 'Inactive' | 'Pending'
export type PlatformDataScopeType =
  | 'All'
  | 'Department'
  | 'Assigned Agents'
  | 'Assigned Merchants'
  | 'Self'

export interface PlatformAccountRecord {
  id: string
  username: string
  displayName: string
  email: string
  department: string
  roleIds: string[]
  status: PlatformAccountStatus
  mfaEnabled: boolean
  lastLoginAt?: string
  lastLoginIp?: string
  passwordChangedAt: string
  failedLoginCount: number
  createdAt: string
  updatedAt: string
}

export interface PlatformRoleRecord {
  id: string
  code: string
  name: string
  description: string
  accountCount: number
  permissionIds: string[]
  sensitivePermissionIds: string[]
  dataScopeId: string
  builtIn: boolean
  status: FinanceSettingStatus
  updatedAt: string
}

export interface PlatformPermissionRecord {
  id: string
  module: string
  name: string
  code: string
  action: 'View' | 'Create' | 'Edit' | 'Delete' | 'Export' | 'Approve' | 'Execute'
  sensitive: boolean
  riskLevel: 'Normal' | 'Medium' | 'High'
  description: string
}

export interface PlatformSensitiveGrantRecord {
  id: string
  roleId: string
  permissionId: string
  reason: string
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Revoked'
  requestedBy: string
  requestedAt: string
  reviewedBy?: string
  reviewedAt?: string
  expiresAt?: string
}

export interface PlatformDataScopeRecord {
  id: string
  name: string
  type: PlatformDataScopeType
  agentIds: string[]
  merchantIds: string[]
  description: string
  roleCount: number
  status: FinanceSettingStatus
  updatedAt: string
}

export interface PlatformAccessLog {
  id: string
  entityType:
    | 'Account'
    | 'Role'
    | 'Permission'
    | 'Sensitive Grant'
    | 'Data Scope'
    | 'Game'
    | 'Merchant'
    | 'Exchange Rate'
    | 'Reconciliation'
    | 'Report'
  entityId: string
  module?: string
  action: string
  beforeValue: string
  afterValue: string
  operator: string
  ipAddress?: string
  riskLevel?: 'Normal' | 'Medium' | 'High'
  createdAt: string
  note: string
}

export interface PlatformLanguageRecord {
  code: string
  name: string
  nativeName: string
  direction: 'LTR' | 'RTL'
  dateFormat: string
  timeFormat: '12-hour' | '24-hour'
  translationProgress: number
  availableInBackOffice: boolean
  defaultLanguage: boolean
  status: FinanceSettingStatus
  updatedAt: string
}

export interface PlatformRegionRecord {
  code: string
  name: string
  englishName: string
  defaultLanguage: string
  defaultTimezone: string
  currencyCodes: string[]
  allowed: boolean
  status: FinanceSettingStatus
  updatedAt: string
}

export interface PlatformTimezoneRecord {
  id: string
  name: string
  region: string
  utcOffset: string
  observesDst: boolean
  defaultTimezone: boolean
  status: FinanceSettingStatus
  updatedAt: string
}

export interface PlatformLocaleLog {
  id: string
  targetType: 'Language' | 'Region' | 'Timezone'
  targetId: string
  action: string
  beforeValue: string
  afterValue: string
  operator: string
  createdAt: string
}

export type PlatformNotificationEventType =
  | 'Risk Alert'
  | 'Approval Pending'
  | 'Exchange Rate Alert'
  | 'Settlement Status'
  | 'Account Security'
  | 'System Error'

export type PlatformNotificationChannel = 'In-App' | 'Email' | 'Webhook'
export type PlatformNotificationStatus = 'Pending' | 'Sent' | 'Partial' | 'Failed' | 'Suppressed'

export interface PlatformNotificationRuleRecord {
  id: string
  name: string
  eventType: PlatformNotificationEventType
  severity: 'Info' | 'Warning' | 'Critical'
  roleIds: string[]
  channels: PlatformNotificationChannel[]
  aggregationMinutes: number
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  template: string
  enabled: boolean
  lastTriggeredAt?: string
  triggerCount: number
  updatedAt: string
}

export interface PlatformNotificationLogRecord {
  id: string
  ruleId: string
  eventType: PlatformNotificationEventType
  eventSourceId: string
  subject: string
  summary: string
  recipients: string[]
  channels: PlatformNotificationChannel[]
  channelResults: Array<{
    channel: PlatformNotificationChannel
    status: 'Sent' | 'Failed' | 'Suppressed'
    message?: string
  }>
  status: PlatformNotificationStatus
  attempts: number
  triggeredAt: string
  sentAt?: string
  errorMessage?: string
}

export interface PlatformBasicSettingsRecord {
  platformName: string
  platformCode: string
  environmentLabel: string
  supportEmail: string
  defaultLanguage: string
  defaultTimezone: string
  dateFormat: string
  maintenanceMode: boolean
  maintenanceMessage: string
  recordRetentionDays: number
  updatedAt: string
  updatedBy: string
}

export interface PlatformLoginSecuritySettings {
  minimumPasswordLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecialCharacter: boolean
  passwordExpiryDays: number
  passwordHistoryCount: number
  maximumFailedAttempts: number
  lockoutMinutes: number
  sessionTimeoutMinutes: number
  maximumConcurrentSessions: number
  forceMfaForSensitiveRoles: boolean
  loginAlertEnabled: boolean
  ipAllowlistEnabled: boolean
  ipAllowlist: string[]
  updatedAt: string
  updatedBy: string
}

export interface PlatformLoginLogRecord {
  id: string
  accountId?: string
  username: string
  displayName?: string
  result: 'Success' | 'Failed' | 'Locked' | 'MFA Failed' | 'Logged Out' | 'Session Expired'
  ipAddress: string
  location: string
  device: string
  userAgent: string
  reason: string
  occurredAt: string
  riskLevel: 'Normal' | 'Medium' | 'High'
}

export interface PlatformSystemErrorRecord {
  id: string
  service: string
  environment: 'Production' | 'Staging' | 'Sandbox'
  severity: 'Info' | 'Warning' | 'Critical'
  errorCode: string
  message: string
  traceId: string
  occurrenceCount: number
  status: 'New' | 'Investigating' | 'Resolved' | 'Ignored'
  assignee?: string
  firstOccurredAt: string
  lastOccurredAt: string
  resolvedAt?: string
  resolution?: string
}

export interface PlatformSystemSettingLog {
  id: string
  settingType: 'Basic' | 'Login Security'
  action: string
  beforeValue: string
  afterValue: string
  operator: string
  createdAt: string
}
