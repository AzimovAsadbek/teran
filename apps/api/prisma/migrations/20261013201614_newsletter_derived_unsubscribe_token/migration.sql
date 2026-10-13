-- Newsletter unsubscribe links are now derived with HMAC(APP_SECRET, subscriber id), so every
-- e-mail or export can include a working link. The stored hashes belonged to random tokens that
-- were never sent to anyone (and could not be), so dropping them loses no usable information.

-- DropIndex
DROP INDEX "NewsletterSubscriber_unsubscribeTokenHash_key";

-- AlterTable
ALTER TABLE "NewsletterSubscriber" DROP COLUMN "unsubscribeTokenHash";
