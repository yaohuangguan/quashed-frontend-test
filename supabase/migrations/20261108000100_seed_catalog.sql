-- Catalog data shown in the design: three providers and address suggestions.
-- Feature cells follow the FeatureValue shape in _shared/providers.ts.

insert into public.providers
  (id, name, tagline, monthly_price_cents, sort_order, features, purchase_form, retrieved_at)
values
  (
    'cloudid', 'Cloudid', 'Unlimited data for your convenience', 10688, 1,
    '{
      "yearlyPayment": {"type": "price", "amountCents": 100000, "per": "year"},
      "data": {"type": "text", "text": "Unlimited"},
      "roaming": {"type": "excluded"},
      "firewall": {"type": "included"},
      "vpn": {"type": "included"},
      "support": {"type": "text", "text": "Text"},
      "router": {"type": "price", "amountCents": 1200, "per": "month"}
    }',
    '{
      "dataPlans": ["10 Gb", "20 Gb", "30 Gb"],
      "fields": ["dataPlan", "contractStartDate", "additionalServices", "currentProvider"],
      "additionalServices": ["VPN", "Dedicated IP", "24/7 Support"]
    }',
    now() - interval '13 minutes'
  ),
  (
    'pronete', 'Pronete', 'Your internet provider since 2006', 9845, 2,
    '{
      "yearlyPayment": {"type": "price", "amountCents": 90000, "per": "year"},
      "data": {"type": "text", "text": "30 GB / month"},
      "roaming": {"type": "price", "amountCents": 10000, "per": "GB"},
      "firewall": {"type": "included"},
      "vpn": {"type": "excluded"},
      "support": {"type": "included"},
      "router": {"type": "excluded"}
    }',
    '{
      "dataPlans": ["10 Gb", "20 Gb", "30 Gb", "Unlimited"],
      "fields": ["contractStartDate", "dataPlan", "needsRouter"],
      "additionalServices": []
    }',
    now() - interval '13 minutes'
  ),
  (
    'tebiobio', 'Tebiobio', 'Stay connected 24/7', 13236, 3,
    '{
      "yearlyPayment": {"type": "price", "amountCents": 120000, "per": "year"},
      "data": {"type": "text", "text": "Unlimited"},
      "roaming": {"type": "included"},
      "firewall": {"type": "price", "amountCents": 1500, "per": "month"},
      "vpn": {"type": "text", "text": "Free VPN"},
      "support": {"type": "excluded"},
      "router": {"type": "included"}
    }',
    '{
      "dataPlans": ["10 Gb", "20 Gb", "30 Gb"],
      "fields": ["contractStartDate", "dataPlan", "additionalServices", "currentProvider"],
      "additionalServices": ["VPN", "Dedicated IP", "24/7 Support"]
    }',
    now() - interval '13 minutes'
  );

insert into public.address_suggestions (line) values
  ('100 Queen Street'),
  ('100 Queen Street #B'),
  ('12 Queen Street'),
  ('1 Queen Street'),
  ('25 Albert Street'),
  ('7 Albert Street'),
  ('48 Shortland Street'),
  ('205 Victoria Street West'),
  ('88 Ponsonby Road'),
  ('150 Karangahape Road'),
  ('3 Customs Street East'),
  ('19 Hobson Street');
