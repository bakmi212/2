-- Insert default roles
INSERT INTO roles (id, name, description, permissions) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'Full system access', '{"all": true}'),
  ('00000000-0000-0000-0000-000000000002', 'member', 'Standard member access', '{"products": {"read": true}, "categories": {"read": true}, "subscriptions": {"own": true}, "licenses": {"own": true}, "payments": {"own": true}, "invoices": {"own": true}, "affiliates": {"own": true}}');

-- Insert default site settings
INSERT INTO site_settings (key, value, value_type, description) VALUES
  ('site_name', 'SaaS Platform', 'string', 'The name of the platform'),
  ('site_tagline', 'Premium Digital Products & Solutions', 'string', 'Site tagline'),
  ('site_description', 'Discover premium digital products, software licenses, and subscriptions. Quality solutions for your business needs.', 'string', 'Meta description for SEO'),
  ('contact_email', 'support@saasplatform.com', 'string', 'Contact email address'),
  ('support_email', 'support@saasplatform.com', 'string', 'Support email address'),
  ('currency', 'USD', 'string', 'Default currency'),
  ('currency_symbol', '$', 'string', 'Currency symbol'),
  ('tax_rate', '0.1', 'number', 'Default tax rate (10%)'),
  ('midtrans_server_key', '', 'string', 'Midtrans server key'),
  ('midtrans_client_key', '', 'string', 'Midtrans client key'),
  ('midtrans_is_production', 'false', 'boolean', 'Midtrans production mode'),
  ('smtp_host', '', 'string', 'SMTP server host'),
  ('smtp_port', '587', 'number', 'SMTP server port'),
  ('smtp_user', '', 'string', 'SMTP username'),
  ('smtp_pass', '', 'string', 'SMTP password'),
  ('smtp_from', '', 'string', 'SMTP from email'),
  ('trial_days', '14', 'number', 'Default trial period in days'),
  ('default_commission_rate', '0.1', 'number', 'Default affiliate commission rate');

-- Insert categories
INSERT INTO categories (id, name, slug, description, image_url, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Software & Apps', 'software-apps', 'Discover powerful software applications for productivity, creativity, and development.', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400', 1),
  ('10000000-0000-0000-0000-000000000002', 'Developer Tools', 'developer-tools', 'Essential tools and SDKs for software developers and engineers.', 'https://images.unsplash.com/photo-1461749480676-d835a135fbd1?w=400', 2),
  ('10000000-0000-0000-0000-000000000003', 'Design & Creative', 'design-creative', 'Professional design tools for UI/UX, graphics, and digital art.', 'https://images.unsplash.com/photo-1561070791-2526d30994b7?w=400', 3),
  ('10000000-0000-0000-0000-000000000004', 'Business & Productivity', 'business-productivity', 'Scale your business with powerful productivity and management tools.', 'https://images.unsplash.com/photo-1454165804606-3dba573b78aa?w=400', 4),
  ('10000000-0000-0000-0000-000000000005', 'Security & Privacy', 'security-privacy', 'Protect your digital assets with enterprise-grade security solutions.', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=400', 5),
  ('10000000-0000-0000-0000-000000000006', 'Cloud & Hosting', 'cloud-hosting', 'Cloud infrastructure and hosting solutions for modern businesses.', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400', 6);

-- Insert products
INSERT INTO products (id, name, slug, description, short_description, price, compare_price, category_id, image_url, features, version, license_type, license_limit, is_active, is_featured, sales_count, rating_average, rating_count) VALUES
  ('20000000-0000-0000-0000-000000000001', 'CodeFlow Pro', 'codeflow-pro', 'CodeFlow Pro is the ultimate IDE for modern development teams. Featuring AI-powered code completion, intelligent debugging, and seamless Git integration. Build faster, ship better code.', 'Advanced IDE with AI assistance', 149.00, 199.00, '10000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1461749480676-d835a135fbd1?w=600', '["AI-powered code completion", "Intelligent debugging", "Git integration", "Multi-language support", "Real-time collaboration", "Custom themes", "Plugin marketplace", "Cloud sync"]', '3.5.0', 'single', 3, true, true, 1247, 4.8, 156),
  ('20000000-0000-0000-0000-000000000002', 'DesignMaster Suite', 'designmaster-suite', 'Professional design toolkit with vector editing, prototyping, and collaboration features. Create stunning UI/UX designs with industry-leading tools.', 'Complete design toolkit', 299.00, 349.00, '10000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1561070791-2526d30994b7?w=600', '["Vector editing", "Prototyping tools", "Team collaboration", "Asset library", "Auto-layout system", "Design tokens", "Export to code", "Version history"]', '2.8.0', 'single', 2, true, true, 834, 4.7, 98),
  ('20000000-0000-0000-0000-000000000003', 'CloudVault Enterprise', 'cloudvault-enterprise', 'Secure cloud storage and file management for enterprises. End-to-end encryption, advanced access controls, and seamless team collaboration.', 'Enterprise cloud storage', 49.00, 69.00, '10000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=600', '["End-to-end encryption", "Unlimited storage", "Team collaboration", "Advanced access controls", "File versioning", "Compliance ready", "API access", "Priority support"]', '4.2.1', 'subscription', 5, true, true, 2341, 4.9, 312),
  ('20000000-0000-0000-0000-000000000004', 'TaskFlow Manager', 'taskflow-manager', 'Streamline your workflows with intelligent task management. AI-powered prioritization, team collaboration, and in-depth analytics.', 'Smart task management', 19.00, 29.00, '10000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1454165804606-3dba573b78aa?w=600', '["AI task prioritization", "Team workspaces", "Time tracking", "Gantt charts", "Kanban boards", "Calendar sync", "Reports & analytics", "Mobile apps"]', '1.9.5', 'subscription', 10, true, true, 3567, 4.6, 421),
  ('20000000-0000-0000-0000-000000000005', 'SecureGuard Pro', 'secureguard-pro', 'Complete cybersecurity solution for teams. Advanced threat detection, vulnerability scanning, and real-time protection.', 'Advanced security suite', 199.00, 249.00, '10000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?w=600', '["Threat detection", "Vulnerability scanning", "Firewall protection", "VPN included", "Password manager", "Dark web monitoring", "24/7 monitoring", "Incident response"]', '5.0.0', 'single', 5, true, true, 623, 4.5, 87),
  ('20000000-0000-0000-0000-000000000006', 'DataInsight Analytics', 'datainsight-analytics', 'Powerful business intelligence platform. Transform raw data into actionable insights with advanced visualization and AI-powered analysis.', 'Business intelligence platform', 99.00, 149.00, '10000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600', '["Advanced dashboards", "AI insights", "Custom reports", "Data connectors", "Scheduled reports", "Team sharing", "Export options", "API integration"]', '3.1.0', 'subscription', 20, true, true, 1089, 4.7, 143),
  ('20000000-0000-0000-0000-000000000007', 'APIForge Studio', 'apiforge-studio', 'Professional API development and testing platform. Design, mock, test, and document APIs with ease.', 'API development toolkit', 79.00, 99.00, '10000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1518436757802-3863d6b2a6e6?w=600', '["API designer", "Mock server", "Auto documentation", "Testing suite", "Environment management", "Team collaboration", "CI/CD integration", "Version control"]', '2.4.0', 'single', 2, true, false, 456, 4.6, 67),
  ('20000000-0000-0000-0000-000000000008', 'PixelPerfect Editor', 'pixelperfect-editor', 'Professional image editing software with AI-powered tools. From basic edits to complex compositions.', 'Image editing software', 129.00, 179.00, '10000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1572044162444-ad60fcd45f0c?w=600', '["AI enhancement", "Layer support", "Filters & effects", "RAW processing", "Batch editing", "Content-aware tools", "Non-destructive editing", "Plugin support"]', '6.2.0', 'single', 3, true, false, 789, 4.4, 102);
