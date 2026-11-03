CREATE INDEX "quotes_user_status_idx" ON "quotes" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "reviews_menuisier_idx" ON "reviews" USING btree ("menuisier_id");