-- 0002_enums
-- Authority: PROJECT_SOURCE_OF_TRUTH.md section 8.3, verbatim, in the listed
-- order. One logical unit: all 33 enumerated types. 31 of them are used in
-- columns; every CHECK that would mirror an enum is omitted (doc 04 section
-- "Constraints") because the enum itself already constrains.

CREATE TYPE evidence_status        AS ENUM ('OBSERVED','EXTRACTED','PATTERN','INFERRED','UNKNOWN');
--> statement-breakpoint
CREATE TYPE provenance_kind        AS ENUM ('SOURCE_CRAWL','SOURCE_DERIVED','DERIVED_PARSER','ADMIN','SYSTEM','AI_SUGGESTED');
--> statement-breakpoint
CREATE TYPE record_state           AS ENUM ('DRAFT','ACTIVE','ARCHIVED');
--> statement-breakpoint
CREATE TYPE review_state           AS ENUM ('UNREVIEWED','PENDING','APPROVED','REJECTED');
--> statement-breakpoint
CREATE TYPE gemstone_kind          AS ENUM ('SINGLE','PAIR');
--> statement-breakpoint
CREATE TYPE product_kind           AS ENUM ('CONFIGURED','READY_MADE','LOOSE_STONE','STONE_PAIR','SETTING_ONLY');
--> statement-breakpoint
CREATE TYPE product_state          AS ENUM ('DRAFT','ACTIVE','ARCHIVED','SOLD_OUT','DISCONTINUED');
--> statement-breakpoint
CREATE TYPE jewellery_type         AS ENUM ('RING','EARRINGS','NECKLACE','PENDANT','BRACELET','BROOCH','CUFFLINKS','CHARM');
--> statement-breakpoint
CREATE TYPE metal_code             AS ENUM ('W10','Y10','R10','W14','Y14','R14','W18','Y18','R18','PT','SL','YW14','YW18','WY14','WY18');
--> statement-breakpoint
CREATE TYPE stone_shape            AS ENUM ('OVAL','ROUND','CUSHION','EMERALD_CUT','PEAR','RADIANT','PRINCESS','HEART','TRILLION','ASSCHER_OCTAGON','BAGUETTE','MARQUISE','OTHER');
--> statement-breakpoint
CREATE TYPE cutting_style          AS ENUM ('FACETED','CABOCHON','OTHER');
--> statement-breakpoint
CREATE TYPE treatment_code         AS ENUM ('NO_ENHANCEMENT','HEAT_TREATED','VAPOR_INFUSED_COATING','IRRADIATION','FRACTURE_FILL','OIL','OTHER','UNKNOWN');
--> statement-breakpoint
CREATE TYPE media_kind             AS ENUM ('IMAGE','LIFESTYLE','VIDEO_360','VIDEO','MODEL_3D','CERTIFICATE','REPORT','APPRAISAL','DOCUMENT','OTHER');
--> statement-breakpoint
CREATE TYPE media_role             AS ENUM ('PRIMARY','GALLERY','THUMBNAIL','LOGO','PACKAGING','DETAIL','PRONG','CERTIFICATE','REPORT','APPRAISAL','PREVIEW_RENDER','SCENE_3D','OTHER');
--> statement-breakpoint
CREATE TYPE asset_processing_state AS ENUM ('PENDING','FETCHING','VALIDATING','PROCESSING','READY','FAILED','SKIPPED');
--> statement-breakpoint
CREATE TYPE document_kind          AS ENUM ('CERTIFICATE','GEM_REPORT','APPRAISAL','INVOICE','POLICY','OTHER');
--> statement-breakpoint
CREATE TYPE verification_status    AS ENUM ('UNVERIFIED','EXTRACTED','CROSS_CHECKED','VERIFIED','REJECTED');
--> statement-breakpoint
CREATE TYPE dyo_state              AS ENUM ('DRAFT','VALIDATING','VALID','INCOMPATIBLE','PRICED','ADDED_TO_CART','ORDERED','EXPIRED');
--> statement-breakpoint
CREATE TYPE compatibility_result   AS ENUM ('COMPATIBLE','INCOMPATIBLE','UNKNOWN','REQUIRES_REVIEW');
--> statement-breakpoint
CREATE TYPE cart_state             AS ENUM ('ACTIVE','CONVERTED','ABANDONED','EXPIRED');
--> statement-breakpoint
CREATE TYPE order_state            AS ENUM ('PENDING_PAYMENT','PAID','IN_FULFILLMENT','FULFILLED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED');
--> statement-breakpoint
CREATE TYPE payment_state          AS ENUM ('CREATED','AUTHORIZED','CAPTURED','FAILED','VOIDED','PARTIALLY_REFUNDED','REFUNDED');
--> statement-breakpoint
CREATE TYPE refund_state           AS ENUM ('REQUESTED','APPROVED','PROCESSING','SUCCEEDED','FAILED','REJECTED');
--> statement-breakpoint
CREATE TYPE discount_type          AS ENUM ('PERCENTAGE','FIXED_AMOUNT','FREE_SHIPPING','FINANCING','PROTECTION_PLAN');
--> statement-breakpoint
CREATE TYPE conversation_channel   AS ENUM ('WEB','WHATSAPP','ADMIN','API');
--> statement-breakpoint
CREATE TYPE conversation_state     AS ENUM ('OPEN','AWAITING_HUMAN','HANDED_OFF','RESOLVED','CLOSED');
--> statement-breakpoint
CREATE TYPE message_role           AS ENUM ('USER','ASSISTANT','TOOL','SYSTEM','HUMAN_AGENT');
--> statement-breakpoint
CREATE TYPE handoff_reason         AS ENUM ('CUSTOMER_REQUEST','LOW_CONFIDENCE','CERTIFICATE_ANOMALY','COMPLEX_DYO','HIGH_VALUE','SENSITIVE_OPERATION','POLICY_ESCALATION','DISSATISFACTION','NO_INFORMATION');
--> statement-breakpoint
CREATE TYPE job_state              AS ENUM ('QUEUED','RUNNING','SUCCEEDED','FAILED','DEAD_LETTER','CANCELLED');
--> statement-breakpoint
CREATE TYPE ai_provider            AS ENUM ('VERCEL_AI_GATEWAY','OPENROUTER','AZURE_OPENAI','ANTHROPIC','LOCAL');
--> statement-breakpoint
CREATE TYPE domain_event_status    AS ENUM ('PENDING','PUBLISHED','FAILED','DEAD_LETTER');
--> statement-breakpoint
CREATE TYPE content_block_type     AS ENUM ('HERO','RICH_TEXT','IMAGE','IMAGE_GALLERY','PRODUCT_COLLECTION','GEMSTONE_COLLECTION','CATEGORY_GRID','FAQ','BUYING_GUIDE','CERTIFICATE_GUIDE','COMPARISON_TABLE','VIDEO','CTA','BANNER','TESTIMONIAL','SHOWROOM_CTA','VEDIC_CTA','ASTROLOGY_CONTENT','CUSTOM_DESIGN_CTA','CONTACT_CTA');
--> statement-breakpoint
CREATE TYPE seo_entity_kind        AS ENUM ('PRODUCT','CATEGORY','VARIETY','COLLECTION','PAGE','ARTICLE','ORGANIZATION');
