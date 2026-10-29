import {
  AudioLines,
  Ban,
  BarChart3,
  Bot,
  Contact,
  CheckCheck,
  Gauge,
  Inbox,
  Link2,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageCircle,
  ListChecks,
  ListOrdered,
  Building2,
  PlugZap,
  PhoneCall,
  Route,
  Send,
  ShieldCheck,
  Smartphone,
  Upload,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";

/** Routes where the global date-range filter is meaningless and stays hidden. */
export const DATE_PICKER_HIDDEN_PATHS = [
  "/leads-upload",
  "/email-templates",
  "/campaign-leads",
  "/agent-mail",
  "/manager-view",
  "/whatsapp-automation",
  "/double-tick",
  "/stringee-agents",
  "/settings/integrations",
  "/settings/dispositions",
  "/platform/companies",
  "/settings/call-quality",
  "/admin/users",
  "/admin/campaigns",
  "/admin/lists",
  "/admin/leads",
  "/admin/dnc",
  "/manual-analysis",
];

/**
 * Sidebar navigation, grouped by purpose. Single source of truth — the desktop
 * sidebar, the mobile drawer and the top-bar page title all read from here.
 *
 * Item shape: { name, path, icon, description?, end?, children?, requires? }
 *  - `requires` names an integration ("whatsapp", "stringee", "email", "doubletick");
 *    the item is hidden when the user's company does not have it (selectIntegrations).
 *  - `description` is the one-line subtitle the top bar shows under the title.
 *  - `end: true` makes the NavLink match exactly (needed for "/", which would
 *    otherwise stay active on every route).
 *  - `children` renders a collapsible sub-section; the parent has no path.
 */
export function getNavGroups({ isAdmin, isWhatsappAdmin, isCompanyAdmin, isPlatformAdmin, integrations }) {
  const groups = withIntegrations(baseNavGroups({ isAdmin, isWhatsappAdmin, isCompanyAdmin }), integrations);
  // Platform admin (AdminR): the companies themselves, above any one company.
  return isPlatformAdmin
    ? [...groups, { label: "Platform", items: [{ name: "Companies", path: "/platform/companies", icon: Building2, description: "Create companies and choose each login's company" }] }]
    : groups;
}

/** Drop items whose integration the company lacks, then empty sub-menus and groups. */
function withIntegrations(groups, integrations) {
  const has = (item) => !item.requires || !integrations || integrations[item.requires] !== false;
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter(has)
        .map((item) => (item.children ? { ...item, children: item.children.filter(has) } : item))
        .filter((item) => !item.children || item.children.length),
    }))
    .filter((group) => group.items.length);
}

function baseNavGroups({ isAdmin, isWhatsappAdmin, isCompanyAdmin }) {
  const whatsappConsole = isWhatsappAdmin
    ? [{ name: "Admin Console", path: "/whatsapp-admin", icon: ShieldCheck, description: "Every WhatsApp conversation, across numbers", requires: "whatsapp" }]
    : [];

  if (isAdmin) {
    return [
      {
        label: "Overview",
        items: [
          { name: "Dashboard", path: "/", icon: LayoutDashboard, end: true, description: "Live dialling, connects and lead flow at a glance" },
          { name: "Agent Productivity", path: "/selective", icon: Gauge, description: "Who is dialling, talking and converting" },
          { name: "Manager View", path: "/manager-view", icon: UserCog, description: "Campaign, ad and lead performance in one view" },
          { name: "Agent Mapping", path: "/stringee-agents", icon: Link2, description: "Link agents to their Stringee users and numbers", requires: "stringee" },
        ],
      },
      {
        label: "Leads",
        items: [
          { name: "Leads Upload", path: "/leads-upload", icon: Upload, description: "Bring new leads into the dialler" },
          { name: "Lead Router", path: "/campaign-leads", icon: Route, description: "Rules that send each lead to the right campaign" },
          { name: "Lead Management", path: "/lead-management", icon: Users, description: "Meta and website leads, from first touch onwards" },
        ],
      },
      {
        label: "Outreach",
        items: [
          { name: "Email Templates", path: "/email-templates", icon: Mail, description: "Reusable emails and attachments for the team", requires: "email" },
          {
            name: "WhatsApp",
            icon: MessageCircle,
            children: [
              { name: "Sessions", path: "/whatsapp-sessions", icon: Smartphone, description: "Connected WhatsApp numbers and routing", requires: "whatsapp" },
              { name: "Automation", path: "/whatsapp-automation", icon: Bot, description: "Lead greetings, templates and holidays", requires: "whatsapp" },
              ...whatsappConsole,
            ],
          },
          { name: "DoubleTick", path: "/double-tick", icon: CheckCheck, description: "WhatsApp CRM conversations and activity", requires: "doubletick" },
        ],
      },
      {
        label: "Reports",
        items: [
          { name: "Reporting", path: "/reporting", icon: BarChart3, description: "Hot leads, call outcomes and recordings" },
          // Uploads are the company's own and cost OpenAI credit: company admins only (the API agrees).
          ...(isCompanyAdmin
            ? [{ name: "Manual Analysis", path: "/manual-analysis", icon: AudioLines, description: "Upload call recordings and score them with the call-quality AI" }]
            : []),
        ],
      },
      // Dialer setup and company settings: only a company-wide admin (the API agrees).
      ...(isCompanyAdmin ? [{
        label: "Dialer setup",
        items: [
          { name: "Users", path: "/admin/users", icon: UserPlus, description: "Logins, their campaigns and softphones" },
          { name: "Campaigns", path: "/admin/campaigns", icon: Megaphone, description: "How Dial Next picks leads, and who dials" },
          { name: "Lead Lists", path: "/admin/lists", icon: ListOrdered, description: "Where leads live, and which campaign dials them" },
          { name: "Leads", path: "/admin/leads", icon: Contact, description: "Upload, move, reset and delete leads" },
          { name: "Do-not-call", path: "/admin/dnc", icon: Ban, description: "Numbers your company never dials" },
        ],
      }] : []),
      ...(isCompanyAdmin ? [{
        label: "Settings",
        items: [
          { name: "Integrations", path: "/settings/integrations", icon: PlugZap, description: "Your company's own email and other accounts" },
          { name: "Dispositions", path: "/settings/dispositions", icon: ListChecks, description: "The call outcomes your agents choose from" },
          { name: "Call Quality", path: "/settings/call-quality", icon: Gauge, description: "What the AI scores your calls on" },
        ],
      }] : []),
    ];
  }

  return [
    {
      label: "Workspace",
      items: [
        { name: "Call", path: "/call", icon: PhoneCall, description: "Your next lead, ready to dial" },
        { name: "Send Email", path: "/agent-mail", icon: Send, description: "Send a templated email to a lead", requires: "email" },
        {
          name: "WhatsApp",
          icon: MessageCircle,
          children: [
            { name: "Inbox", path: "/whatsapp", icon: Inbox, description: "Your WhatsApp conversations", requires: "whatsapp" },
            ...whatsappConsole,
          ],
        },
      ],
    },
    {
      label: "Reports",
      items: [{ name: "Reporting", path: "/reporting", icon: BarChart3, description: "Hot leads, call outcomes and recordings" }],
    },
  ];
}

/** Flattened leaf items — used for page-title lookup. */
export function flattenNavItems(groups) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => (item.children ? item.children : [item]))
  );
}

/** Longest-prefix match so nested routes still resolve to their nav item. */
export function findNavItem(groups, pathname) {
  const leaves = flattenNavItems(groups);
  const exact = leaves.find((i) => i.path === pathname);
  if (exact) return exact;

  return leaves
    .filter((i) => i.path !== "/" && pathname.startsWith(`${i.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0] ?? null;
}

export function findNavTitle(groups, pathname) {
  return findNavItem(groups, pathname)?.name ?? null;
}
