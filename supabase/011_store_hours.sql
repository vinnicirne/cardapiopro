-- Adiciona as configurações de horário de funcionamento na tabela stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "0": { "isOpen": false, "open": "18:00", "close": "23:00" },
  "1": { "isOpen": true, "open": "18:00", "close": "23:00" },
  "2": { "isOpen": true, "open": "18:00", "close": "23:00" },
  "3": { "isOpen": true, "open": "18:00", "close": "23:00" },
  "4": { "isOpen": true, "open": "18:00", "close": "23:00" },
  "5": { "isOpen": true, "open": "18:00", "close": "23:59" },
  "6": { "isOpen": true, "open": "18:00", "close": "23:59" }
}'::jsonb;
