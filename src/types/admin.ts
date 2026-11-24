export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'MODERATOR' | 'USER';

export interface AppUser {
  uid: string;
  name: string;
  handle: string;
  email: string;
  phone?: string;
  role: UserRole;
  is_banned: boolean;
  ban_reason?: string;
  avatar_type?: string;
  user_avatar_path?: string;
  wallet_coins?: number;
  warnings_count?: number;
  created_at?: string;

  // Granular Chat & Call Abuse Controls
  is_chat_banned?: boolean;
  is_call_banned?: boolean;

  // Custom Sub-Option Permissions
  custom_permissions?: Record<string, boolean>;

  // Granular Permissions
  can_manage_users?: boolean;
  can_delete_posts?: boolean;
  can_edit_posts?: boolean;
  can_moderate_comments?: boolean;
  can_manage_chats?: boolean;
  can_manage_monetization?: boolean;
  can_manage_rewards?: boolean;
  can_process_payouts?: boolean;
  can_clean_storage?: boolean;
  can_view_reports?: boolean;
  can_review_reports?: boolean;
  can_give_warning?: boolean;
  can_delete_reel?: boolean;
  can_delete_video?: boolean;
  can_suspend_user?: boolean;
  can_ban_user?: boolean;
  can_manage_verification?: boolean;
  can_delegate_roles?: boolean;
}

export interface AdRevenueEntry {
  id: string;
  period_start: string;
  period_end: string;
  gross_revenue_usd: number;
  verified_impressions: number;
  notes?: string;
  entered_by?: string;
  status: 'PENDING' | 'SETTLED' | 'VOID';
  created_at?: string;
}

export interface CreatorApplication {
  id: string;
  user_handle: string;
  channel_name: string;
  category: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  decision_reason?: string;
}

export interface CreatorPayout {
  id: string;
  user_handle: string;
  method: string;
  account_number: string;
  credits_used: number;
  amount_usd: number;
  amount_bdt: number;
  status: 'PENDING' | 'STAFF_REVIEWED' | 'APPROVE' | 'PAY' | 'REJECTED';
  requires_super_admin?: boolean;
  admin_note?: string;
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_handle: string;
  full_name: string;
  document_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

export interface ReportedContent {
  id: string;
  content_type: 'POST' | 'REEL' | 'STORY' | 'COMMENT' | 'USER' | 'MESSAGE';
  content_id: string;
  reporter_handle: string;
  target_handle: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  assigned_to?: string;
  resolved_by?: string;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_handle: string;
  action: string;
  target: string;
  details: string;
  ip_address?: string;
  can_undo?: boolean;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_handle: string;
  subject: string;
  message: string;
  category: 'ACCOUNT' | 'PAYOUT' | 'BUG' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  admin_reply?: string;
  created_at: string;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  action_url?: string;
  is_active: boolean;
  is_popup_modal?: boolean;
  created_at: string;
}

export interface AppSettingsConfig {
  maintenance_mode: boolean;
  maintenance_message: string;
  registration_enabled: boolean;
  latest_app_version: string;
  min_required_version: string;
  force_update: boolean;
  update_url: string;
  enable_stories: boolean;
  enable_reels: boolean;
  enable_calls: boolean;
  enable_monetization: boolean;

  // AdMob Configurations
  admob_enabled: boolean;
  admob_banner_id: string;
  admob_interstitial_id: string;
  admob_native_id: string;
  admob_rewarded_id: string;
  ad_frequency: number;
  coin_to_bdt_rate: number;

  // Emergency Kill-Switches
  kill_post_uploads: boolean;
  kill_withdrawals: boolean;
  kill_signups: boolean;
  kill_reels_upload: boolean;

  // Financial & Payout Limits
  dual_approval_threshold_bdt: number;
  daily_max_payout_bdt: number;

  // Auto-Moderation Settings
  auto_ban_warning_threshold: number;
  blacklisted_words: string[];

  privacy_policy_url: string;
  terms_conditions_url: string;
}

export interface StorageBucketStat {
  name: string;
  fileCount: number;
  totalSizeBytes: number;
  formattedSize: string;
}

export interface PageItem {
  id: string;
  name: string;
  owner_handle: string;
  category: string;
  followers: number;
  is_verified: boolean;
  created_at: string;
}

export interface GroupItem {
  id: string;
  name: string;
  owner_handle: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  members: number;
  is_reported: boolean;
  created_at: string;
}

export interface BanAppeal {
  id: string;
  user_handle: string;
  ban_reason: string;
  appeal_text: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewed_by?: string;
  created_at: string;
}

export interface FraudFlag {
  id: string;
  user_handle: string;
  reason: string;
  risk_score: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
}

// Enterprise Module Types
export interface BadWordEntry {
  id: string;
  word_or_pattern: string;
  severity: 'WARN' | 'HIDE' | 'BLOCK';
  created_at?: string;
  created_by?: string;
}

export interface BoostedPostEntry {
  id: string;
  user_handle: string;
  post_id: string;
  budget_coins: number;
  target_reach: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED';
  created_at?: string;
}

export interface BannedDeviceEntry {
  id: string;
  identifier_type: 'DEVICE_ID' | 'IP_ADDRESS';
  identifier_value: string;
  reason: string;
  expires_at?: string;
  created_at?: string;
  banned_by?: string;
}

export interface StaffPerformanceSummary {
  admin_handle: string;
  moderation_count: number;
  ban_count: number;
  payout_review_count: number;
  ticket_reply_count: number;
  total_actions: number;
}

export interface AiModerationLog {
  id: string;
  content_type: string;
  content_id: string;
  user_id: string;
  status: 'pending_review' | 'approved_by_admin' | 'auto_blocked';
  nsfw_score: number;
  violence_score: number;
  hate_score: number;
  flagged_labels: string[];
  created_at: string;
  app_users?: {
    name?: string;
    handle?: string;
    user_avatar_path?: string;
  };
}

export interface FeedAlgorithmConfig {
  id: number;
  like_weight: number;
  comment_weight: number;
  share_weight: number;
  watch_time_weight: number;
  recency_decay_hours: number;
  updated_at?: string;
}

export interface ManagedHashtag {
  id: string;
  tag: string;
  is_pinned: boolean;
  is_blacklisted: boolean;
  usage_count: number;
  created_at: string;
}

export interface ReportedChat {
  id: string;
  reporter_id: string;
  reported_id: string;
  message_snapshot: any[];
  reason: string;
  status: 'pending' | 'warned' | 'banned' | 'dismissed';
  created_at: string;
}

export interface AudioLibraryTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
}

export interface CopyrightClaim {
  id: string;
  track_id: string;
  claimant_name: string;
  infringing_content_id: string;
  status: 'pending' | 'valid_strike' | 'rejected';
  created_at: string;
  audio_library?: {
    title?: string;
    artist?: string;
  };
}

export interface LegalDocument {
  id: string;
  slug: string;
  version: string;
  content_html: string;
  updated_at: string;
}

export interface UserDataRequest {
  id: string;
  user_id: string;
  request_type: 'export_data' | 'delete_account';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  created_at: string;
}
