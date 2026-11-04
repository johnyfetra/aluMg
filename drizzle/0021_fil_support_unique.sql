-- Un seul compte de support : les fils ouverts sous un autre administrateur passent sous le plus ancien, et ceux d'un même client sont fusionnés.
DO $$
DECLARE canon uuid; r record; keep uuid;
BEGIN
  SELECT id INTO canon FROM users WHERE role = 'admin' ORDER BY created_at, id LIMIT 1;
  IF canon IS NULL THEN RETURN; END IF;
  FOR r IN SELECT c.id, c.client_id, c.last_message_at FROM conversations c JOIN users u ON u.id = c.menuisier_id WHERE u.role = 'admin' AND c.menuisier_id <> canon LOOP
    SELECT id INTO keep FROM conversations WHERE client_id = r.client_id AND menuisier_id = canon;
    IF keep IS NULL THEN
      UPDATE conversations SET menuisier_id = canon WHERE id = r.id;
      keep := r.id;
    ELSE
      UPDATE messages SET conversation_id = keep WHERE conversation_id = r.id;
      UPDATE conversations SET last_message_at = GREATEST(last_message_at, r.last_message_at) WHERE id = keep;
      DELETE FROM conversations WHERE id = r.id;
    END IF;
    UPDATE messages SET sender_id = canon WHERE conversation_id = keep AND sender_id IN (SELECT id FROM users WHERE role = 'admin');
  END LOOP;
END $$;
