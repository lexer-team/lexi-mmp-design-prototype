import { useState } from "react";
import { RiAddLine, RiDeleteBinLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ConfirmDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/Table";
import { Alert } from "@/components/ui/Alert";

export function IntegrationHealthBanner({ integrations, onReview }: {
  integrations: ReadonlyArray<{ status: string }>;
  onReview: () => void;
}) {
  const disconnectedCount = integrations.filter((integration) => integration.status === "Disconnected").length;

  return (
    <div className="mb-4 shrink-0" aria-live="polite">
      {disconnectedCount > 0 ? (
        <Alert variant="error" title="Integration health">
          <p className="text-destructive">Some of your accounts are disconnected. <button type="button" onClick={onReview} className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Check here to review</button>.</p>
        </Alert>
      ) : (
        <Alert variant="success" title="Integration health">All integrations are connected.</Alert>
      )}
    </div>
  );
}

export interface IntegrationConnectionDraft {
  id: string;
  name: string;
  category: string;
  summary: string;
  syncDirection: "Inbound" | "Outbound" | "Bidirectional";
  connectionType: "Standard" | "Custom";
  ipAddresses?: Array<{ name: string; value: string; addedBy: string }>;
  sshKeyFingerprints?: Array<{ name: string; fingerprint: string; addedBy: string }>;
}

function anonymizeIpAddress(value: string) {
  const parts = value.trim().split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.${parts[2]}.***`;
  if (value.includes(":")) return `${value.trim().split(":").slice(0, 2).join(":")}:***`;
  return "IP address redacted";
}

function isValidIpAddress(value: string) {
  const candidate = value.trim();
  const ipv4Parts = candidate.split(".");
  if (ipv4Parts.length === 4) {
    return ipv4Parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
  }
  if (!candidate.includes(":") || !/^[\da-f:]+$/i.test(candidate)) return false;
  const groups = candidate.split(":").filter(Boolean);
  const hasCompression = candidate.includes("::");
  return groups.length <= 8
    && groups.every((group) => group.length <= 4)
    && (hasCompression ? groups.length < 8 : groups.length === 8);
}

async function fingerprintPublicKey(value: string) {
  const bytes = new TextEncoder().encode(value.trim());
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const encoded = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `SHA256:${encoded.slice(0, 16)}`;
}

const INTEGRATION_LOGO_DOMAINS: Record<string, string> = {
  "Adobe Analytics": "adobe.com",
  "Adobe Commerce": "adobe.com",
  Adyen: "adyen.com",
  Amplitude: "amplitude.com",
  Attentive: "attentive.com",
  "Amazon Redshift": "aws.amazon.com",
  "Azure Synapse": "azure.microsoft.com",
  BigCommerce: "bigcommerce.com",
  BigQuery: "cloud.google.com",
  Bird: "bird.com",
  Braze: "braze.com",
  "CommerceTools": "commercetools.com",
  Databricks: "databricks.com",
  "Google Ads": "ads.google.com",
  "Google Analytics 4": "analytics.google.com",
  Gorgias: "gorgias.com",
  Heap: "heap.io",
  "HubSpot CRM": "hubspot.com",
  "HubSpot Marketing Hub": "hubspot.com",
  Iterable: "iterable.com",
  Intercom: "intercom.com",
  "LinkedIn Ads": "linkedin.com",
  Klaviyo: "klaviyo.com",
  Mailchimp: "mailchimp.com",
  "Meta Ads": "meta.com",
  Mixpanel: "mixpanel.com",
  mParticle: "mparticle.com",
  "Microsoft Dynamics 365": "dynamics.microsoft.com",
  Pipedrive: "pipedrive.com",
  Pinterest: "pinterest.com",
  "Pinterest Ads": "pinterest.com",
  PayPal: "paypal.com",
  PostHog: "posthog.com",
  Postscript: "postscript.io",
  RudderStack: "rudderstack.com",
  Salesforce: "salesforce.com",
  "Salesforce CRM": "salesforce.com",
  "Salesforce Commerce Cloud": "salesforce.com",
  Segment: "segment.com",
  Shopify: "shopify.com",
  Snapchat: "snapchat.com",
  "Snapchat Ads": "snapchat.com",
  Snowflake: "snowflake.com",
  Square: "squareup.com",
  Stripe: "stripe.com",
  Tealium: "tealium.com",
  "TikTok Ads": "tiktok.com",
  Treasure: "treasuredata.com",
  "Treasure Data": "treasuredata.com",
  Twilio: "twilio.com",
  WooCommerce: "woocommerce.com",
  Yotpo: "yotpo.com",
  "Yotpo SMS": "yotpo.com",
  Zendesk: "zendesk.com",
  "Zoho CRM": "zoho.com",
};

export function IntegrationLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const [failed, setFailed] = useState(false);
  const domain = INTEGRATION_LOGO_DOMAINS[name];
  const initials = name.split(/[^A-Za-z0-9]+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
  const sizeClass = size === "sm" ? "size-5 rounded-sm text-[8px]" : "size-7 rounded-md text-[9px]";
  const imageSizeClass = size === "sm" ? "size-3.5" : "size-5";

  return (
    <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-background font-semibold text-foreground-secondary", sizeClass)}>
      {domain && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
          alt=""
          className={cn(imageSizeClass, "object-contain")}
          onError={() => setFailed(true)}
        />
      ) : initials}
    </span>
  );
}

export function DisconnectedConnectionGuidance({ category }: { category: string }) {
  const isSftp = category === "SFTP";
  const causes = isSftp
    ? ["The SFTP password or SSH key may have expired or changed.", "The host, port, folder permissions, or network allowlist may have changed."]
    : ["The access token or API key may have expired or been revoked.", "Account permissions may have changed, or the provider may be temporarily unavailable."];
  const steps = isSftp
    ? ["Verify the SFTP host, port, credentials, and folder permissions.", "Select the affected account and reconnect with valid credentials.", "Retry the file transfer and check the sync log for a successful import."]
    : ["Check the provider status and confirm the account still has the required permissions.", "Select the affected account and reconnect to renew its authorization.", "Retry the sync and check the sync log to confirm data is flowing again."];

  return (
    <div className="space-y-3">
      <p>This account has disconnected and needs to be reconnected to avoid disruption.</p>
      <div className="text-foreground">
        <h3 className="text-sm font-semibold">Potential causes</h3>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-foreground-secondary">
          {causes.map((cause) => <li key={cause}>{cause}</li>)}
        </ul>
      </div>
      <div className="text-foreground">
        <h3 className="text-sm font-semibold">Resolution steps</h3>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-foreground-secondary">
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </div>
  );
}

const STANDARD_INTEGRATIONS: Array<{ id: string; name: string; category: string }> = [
  { id: "shopify", name: "Shopify", category: "Transactions" },
  { id: "bigcommerce", name: "BigCommerce", category: "Transactions" },
  { id: "adobe-commerce", name: "Adobe Commerce", category: "Transactions" },
  { id: "woocommerce", name: "WooCommerce", category: "Transactions" },
  { id: "commercetools", name: "CommerceTools", category: "Transactions" },
  { id: "salesforce-commerce", name: "Salesforce Commerce Cloud", category: "Transactions" },
  { id: "stripe", name: "Stripe", category: "Transactions" },
  { id: "adyen", name: "Adyen", category: "Transactions" },
  { id: "paypal", name: "PayPal", category: "Transactions" },
  { id: "square", name: "Square", category: "Transactions" },
  { id: "klaviyo", name: "Klaviyo", category: "Email" },
  { id: "mailchimp", name: "Mailchimp", category: "Email" },
  { id: "braze", name: "Braze", category: "Email" },
  { id: "iterable", name: "Iterable", category: "Email" },
  { id: "hubspot-marketing", name: "HubSpot Marketing Hub", category: "Email" },
  { id: "attentive", name: "Attentive", category: "SMS" },
  { id: "postscript", name: "Postscript", category: "SMS" },
  { id: "twilio", name: "Twilio", category: "SMS" },
  { id: "yotpo-sms", name: "Yotpo SMS", category: "SMS" },
  { id: "bird", name: "Bird", category: "SMS" },
  { id: "meta-ads", name: "Meta Ads", category: "Paid ads" },
  { id: "google-ads", name: "Google Ads", category: "Paid ads" },
  { id: "tiktok-ads", name: "TikTok Ads", category: "Paid ads" },
  { id: "pinterest-ads", name: "Pinterest Ads", category: "Paid ads" },
  { id: "snapchat-ads", name: "Snapchat Ads", category: "Paid ads" },
  { id: "linkedin-ads", name: "LinkedIn Ads", category: "Paid ads" },
  { id: "ga4", name: "Google Analytics 4", category: "Web analytics" },
  { id: "adobe-analytics", name: "Adobe Analytics", category: "Web analytics" },
  { id: "amplitude", name: "Amplitude", category: "Web analytics" },
  { id: "mixpanel", name: "Mixpanel", category: "Web analytics" },
  { id: "heap", name: "Heap", category: "Web analytics" },
  { id: "posthog", name: "PostHog", category: "Web analytics" },
  { id: "segment", name: "Segment", category: "CDP" },
  { id: "mparticle", name: "mParticle", category: "CDP" },
  { id: "tealium", name: "Tealium", category: "CDP" },
  { id: "rudderstack", name: "RudderStack", category: "CDP" },
  { id: "treasure-data", name: "Treasure Data", category: "CDP" },
  { id: "snowflake", name: "Snowflake", category: "Warehouse" },
  { id: "bigquery", name: "BigQuery", category: "Warehouse" },
  { id: "redshift", name: "Amazon Redshift", category: "Warehouse" },
  { id: "databricks", name: "Databricks", category: "Warehouse" },
  { id: "azure-synapse", name: "Azure Synapse", category: "Warehouse" },
  { id: "salesforce-crm", name: "Salesforce CRM", category: "CRM" },
  { id: "hubspot-crm", name: "HubSpot CRM", category: "CRM" },
  { id: "dynamics-365", name: "Microsoft Dynamics 365", category: "CRM" },
  { id: "pipedrive", name: "Pipedrive", category: "CRM" },
  { id: "zoho-crm", name: "Zoho CRM", category: "CRM" },
  { id: "zendesk", name: "Zendesk", category: "Customer support" },
  { id: "gorgias", name: "Gorgias", category: "Customer support" },
  { id: "intercom", name: "Intercom", category: "Customer support" },
];

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  Transactions: "Import orders, refunds, products, and customer purchase events.",
  Email: "Sync audiences, campaign engagement, delivery, and consent signals.",
  SMS: "Sync subscribers, opt-ins, campaign engagement, and delivery events.",
  "Paid ads": "Push audiences to campaigns and import spend, reach, and conversion performance.",
  "Web analytics": "Import sessions, sources, conversions, and web events.",
  CDP: "Exchange customer profiles and event streams between platforms.",
  Warehouse: "Sync governed customer and event tables with Lexer.",
  CRM: "Import contacts, accounts, opportunities, and lifecycle changes.",
  "Customer support": "Bring tickets, conversations, and service outcomes into customer profiles.",
  Custom: "Connect your system to Lexer using a custom integration setup.",
};

type Direction = IntegrationConnectionDraft["syncDirection"];

export function StandardConnectionPage({
  onBack,
  onConnect,
  directionForCategory,
}: {
  onBack?: () => void;
  onConnect: (integration: IntegrationConnectionDraft) => void;
  directionForCategory: (category: string) => Direction;
}) {
  const [query, setQuery] = useState("");
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const selectedIntegration = STANDARD_INTEGRATIONS.find((integration) => integration.id === selectedIntegrationId);
  const filteredIntegrations = [...STANDARD_INTEGRATIONS]
    .sort((left, right) => left.name.localeCompare(right.name))
    .filter((integration) => (
    `${integration.name} ${integration.category}`.toLowerCase().includes(query.trim().toLowerCase())
    ));

  const createDraft = (
    integration: typeof STANDARD_INTEGRATIONS[number],
    syncDirection = directionForCategory(integration.category),
  ): IntegrationConnectionDraft => ({
    ...integration,
    id: directionForCategory(integration.category) === "Bidirectional"
      ? `${integration.id}-${syncDirection.toLowerCase()}`
      : integration.id,
    summary: CATEGORY_DESCRIPTIONS[integration.category],
    syncDirection,
    connectionType: "Standard",
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          {onBack ? <button type="button" onClick={onBack} className="text-sm font-medium text-primary hover:underline">Back to integrations</button> : null}
          <h2 className="mt-2 text-lg font-semibold text-foreground">Add standard connection</h2>
          <p className="mt-1 max-w-2xl text-sm text-foreground-secondary">Standard connections are ready-to-configure links to commonly used commerce, marketing, analytics, and data platforms. Search by name and review the data direction before connecting.</p>
        </div>
        <span className="text-sm text-muted-foreground">{STANDARD_INTEGRATIONS.length} integrations</span>
      </div>

      <div className="relative max-w-xl">
        <label htmlFor="standard-integration-search" className="sr-only">Search standard integrations</label>
        <Input
          id="standard-integration-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search integrations"
          className="h-10"
        />
      </div>

      <div className="max-h-[19.75rem] overflow-y-auto rounded-xl border border-border bg-card">
        {filteredIntegrations.map((integration) => {
          const active = integration.id === selectedIntegrationId;
          return (
            <button
              key={integration.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedIntegrationId(integration.id)}
              className={`flex w-full items-center justify-between gap-4 border-b border-border px-4 py-3 text-left last:border-b-0 ${active ? "bg-accent" : "hover:bg-muted/50"}`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <IntegrationLogo name={integration.name} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{integration.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-foreground-secondary">
                    <span>{integration.category}</span>
                    <span aria-hidden="true">|</span>
                    <span>{directionForCategory(integration.category) === "Bidirectional" ? "Data ingestion + Activation" : directionForCategory(integration.category)}</span>
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-primary">{active ? "Selected" : "View details"}</span>
            </button>
          );
        })}
        {filteredIntegrations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No integrations match this search.</p>
        ) : null}
      </div>

      {selectedIntegration ? directionForCategory(selectedIntegration.category) === "Bidirectional" ? (
        <div aria-label={`${selectedIntegration.name} connection options`} className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">{selectedIntegration.name}</h3>
            <p className="mt-1 text-sm text-foreground-secondary">Connect each direction separately for this source.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Data ingestion</h4>
                <p className="mt-1 text-sm text-foreground-secondary">Inbound data from {selectedIntegration.name} into Lexer.</p>
              </div>
              <Button className="mt-auto" onClick={() => onConnect(createDraft(selectedIntegration, "Inbound"))}>Connect data ingestion</Button>
            </section>
            <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Activation</h4>
                <p className="mt-1 text-sm text-foreground-secondary">Outbound audiences from Lexer to {selectedIntegration.name}.</p>
              </div>
              <Button className="mt-auto" onClick={() => onConnect(createDraft(selectedIntegration, "Outbound"))}>Connect activation</Button>
            </section>
          </div>
        </div>
      ) : (
        <section aria-label={`${selectedIntegration.name} connection details`} className="rounded-xl border border-border bg-background shadow-sm">
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <p className="text-xs font-medium text-muted-foreground">Connection details</p>
              <h3 className="mt-1 text-base font-semibold text-foreground">{selectedIntegration.name}</h3>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Description</p>
              <p className="mt-1 text-sm text-foreground-secondary">{CATEGORY_DESCRIPTIONS[selectedIntegration.category]}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Category</p>
              <p className="mt-1 text-sm text-foreground">{selectedIntegration.category}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Sync direction</p>
              <p className="mt-1 text-sm text-foreground">{directionForCategory(selectedIntegration.category)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
            <Button variant="outline" onClick={() => setCancelConfirmOpen(true)}>Cancel</Button>
            <Button onClick={() => onConnect(createDraft(selectedIntegration))}>Connect</Button>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        variant="destructive"
        title="Close connection details?"
        description="The selected integration details will close. Your search will stay here so you can continue where you left off."
        confirmLabel="Close details"
        cancelLabel="Keep reviewing"
        onConfirm={() => {
          setSelectedIntegrationId(null);
          setCancelConfirmOpen(false);
        }}
      />
    </div>
  );
}

export function CustomConnectionPage({
  onBack,
  onCreate,
  requests = [],
  addedBy = "Current user",
}: {
  onBack?: () => void;
  onCreate: (integration: IntegrationConnectionDraft) => void;
  requests?: ReadonlyArray<{ id: string; name: string; category: string; summary: string; syncDirection?: string; status: string }>;
  addedBy?: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Webhook");
  const [previousCategory, setPreviousCategory] = useState("Webhook");
  const [submitted, setSubmitted] = useState(false);
  const [sftpRequirementsOpen, setSftpRequirementsOpen] = useState(false);
  const [sftpAllowlistOpen, setSftpAllowlistOpen] = useState(false);
  const [ipEntries, setIpEntries] = useState<Array<{ id: string; name: string; value: string; addedBy: string }>>([]);
  const [keyEntries, setKeyEntries] = useState<Array<{ id: string; name: string; value: string; addedBy: string }>>([]);
  const [ipDraft, setIpDraft] = useState("");
  const [ipNameDraft, setIpNameDraft] = useState("");
  const [ipError, setIpError] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [keyNameDraft, setKeyNameDraft] = useState("");
  const [addingIp, setAddingIp] = useState(false);
  const [addingKey, setAddingKey] = useState(false);
  const [keyError, setKeyError] = useState("");
  const normalizedName = name.trim();

  const submitConnection = () => {
    if (!normalizedName) return;
    const slug = normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    onCreate({
      id: `custom-${slug}-${Date.now()}`,
      name: normalizedName,
      category,
      summary: description.trim() || CATEGORY_DESCRIPTIONS.Custom,
      syncDirection: "Inbound",
      connectionType: "Custom",
      ipAddresses: category === "SFTP" ? ipEntries.map(({ name, value, addedBy: entryAddedBy }) => ({ name, value, addedBy: entryAddedBy })) : undefined,
      sshKeyFingerprints: category === "SFTP" ? keyEntries.map(({ name, value, addedBy: entryAddedBy }) => ({ name, fingerprint: value, addedBy: entryAddedBy })) : undefined,
    });
    if (category === "SFTP") setSftpAllowlistOpen(false);
    setSubmitted(true);
    setName("");
    setDescription("");
  };

  const addIpAddress = () => {
    const value = ipDraft.trim();
    const name = ipNameDraft.trim();
    if (!value || !name) return;
    if (!isValidIpAddress(value)) {
      setIpError("Enter a valid IPv4 or IPv6 address.");
      return;
    }
    setIpEntries((current) => [...current, { id: `ip-${Date.now()}`, name, value: anonymizeIpAddress(value), addedBy }]);
    setIpDraft("");
    setIpNameDraft("");
    setIpError("");
    setAddingIp(false);
  };

  const addPublicKey = async () => {
    const value = keyDraft.trim();
    const name = keyNameDraft.trim();
    if (!value || !name) return;
    try {
      const fingerprint = await fingerprintPublicKey(value);
      setKeyEntries((current) => [...current, { id: `key-${Date.now()}`, name, value: fingerprint, addedBy }]);
      setKeyDraft("");
      setKeyNameDraft("");
      setKeyError("");
      setAddingKey(false);
    } catch {
      setKeyError("This browser could not create a key fingerprint. The key was not saved.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <div>
        {onBack ? <button type="button" onClick={onBack} className="text-sm font-medium text-primary hover:underline">Back to integrations</button> : null}
        <h2 className="mt-2 text-lg font-semibold text-foreground">Add custom connection</h2>
        <p className="mt-1 text-sm text-foreground-secondary">Describe the system and how it should exchange data with Lexer.</p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitConnection();
        }}
        className="space-y-4 rounded-xl border border-border bg-card p-4"
      >
        <div>
          <label htmlFor="custom-integration-name" className="text-sm font-medium text-foreground">Connection name</label>
          <Input id="custom-integration-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1" placeholder="e.g. Acme data platform" required />
        </div>
        <div>
          <label htmlFor="custom-integration-description" className="text-sm font-medium text-foreground">Description</label>
          <Textarea id="custom-integration-description" value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1" placeholder="What data should this connection exchange?" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="custom-integration-category" className="text-sm font-medium text-foreground">Category</label>
            <select id="custom-integration-category" value={category} onChange={(event) => {
              const nextCategory = event.target.value;
              if (nextCategory === "SFTP") {
                setPreviousCategory(category);
                setCategory(nextCategory);
                setSftpRequirementsOpen(true);
              } else {
                setCategory(nextCategory);
              }
            }} className="mt-1 h-10 w-full rounded-lg border border-input-border bg-input px-3 text-sm text-foreground shadow-xs outline-none focus-visible:ring-4 focus-visible:ring-ring/40">
              {["Webhook", "SFTP", "One-time upload", "Transactions", "Email", "SMS", "Paid ads", "Web analytics", "CDP", "Warehouse", "CRM", "Customer support"].map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
        {category === "SFTP" ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-sm italic text-primary">Inbound data ingestion only. {ipEntries.length} IP address{ipEntries.length === 1 ? "" : "es"} and {keyEntries.length} SSH key{keyEntries.length === 1 ? "" : "s"} saved.</p>
            <button type="button" onClick={() => setSftpAllowlistOpen(true)} className="mt-1 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open SFTP settings</button>
          </div>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          {onBack ? <Button type="button" variant="outline" onClick={onBack}>Cancel</Button> : null}
          <Button type="submit" disabled={!normalizedName || (category === "SFTP" && (ipEntries.length === 0 || keyEntries.length === 0))}>Submit inbound request</Button>
        </div>
      </form>

      {requests.length > 0 ? (
        <section aria-label="Custom connection requests" className="space-y-3">
          <h3 className="text-base font-semibold text-foreground">Custom connection requests</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connection</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sync direction</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium text-foreground">{request.name}</TableCell>
                  <TableCell>{request.category}</TableCell>
                  <TableCell>{request.syncDirection ?? "Inbound"}</TableCell>
                  <TableCell className="whitespace-normal break-words">{request.summary}</TableCell>
                  <TableCell><Badge variant="warning" size="sm">{request.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Custom inbound connection requested</DialogTitle>
            <DialogDescription>We&apos;ll scope the requirements for this inbound connection and reach out to you.</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setSubmitted(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sftpRequirementsOpen}>
        <DialogContent size="sm" hideClose onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>SFTP access requirements</DialogTitle>
            <DialogDescription>To configure inbound SFTP data ingestion, we need the public IP address or addresses your team will connect from and an SSH public key.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCategory(previousCategory);
              setSftpRequirementsOpen(false);
            }}>Cancel</Button>
            <Button onClick={() => {
              setSftpRequirementsOpen(false);
              setSftpAllowlistOpen(true);
            }}>Agree</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sftpAllowlistOpen} onOpenChange={setSftpAllowlistOpen}>
        <DialogContent
          size="md"
          className="inset-y-0 left-auto right-0 top-0 h-full max-h-screen w-full max-w-md translate-x-0 translate-y-0 overflow-y-auto rounded-none p-0 sm:rounded-l-xl"
        >
          <div className="border-b border-border px-5 py-4 pr-12">
            <DialogHeader>
              <DialogTitle>SFTP access</DialogTitle>
              <DialogDescription>Add the client network IPs and SSH public keys authorized for inbound data ingestion.</DialogDescription>
            </DialogHeader>
          </div>

          <div className="divide-y divide-border px-5">
            <section className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Whitelisted IP addresses</h3>
                  <p className="mt-1 text-xs text-foreground-secondary">Saved addresses are masked in this prototype.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddingIp(true)}>
                  <RiAddLine className="size-4" />
                  Add new IP address
                </Button>
              </div>
              {ipEntries.length > 0 ? (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {ipEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{entry.name}</span>
                        <span className="block truncate text-xs text-foreground-secondary">{entry.value}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Added by {entry.addedBy || addedBy}</span>
                      </span>
                      <button type="button" aria-label="Remove IP address" onClick={() => setIpEntries((current) => current.filter((item) => item.id !== entry.id))} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-muted-foreground">No IP addresses added.</p>}
              {addingIp && (
                <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); addIpAddress(); }}>
                  <label htmlFor="sftp-ip-name" className="text-xs font-medium text-foreground">IP address name</label>
                  <Input id="sftp-ip-name" value={ipNameDraft} onChange={(event) => setIpNameDraft(event.target.value)} placeholder="e.g. Head office" autoFocus />
                  <label htmlFor="sftp-ip-address" className="text-xs font-medium text-foreground">Public IP address</label>
                  <Input id="sftp-ip-address" value={ipDraft} onChange={(event) => setIpDraft(event.target.value)} placeholder="e.g. 203.47.82.3" />
                  {ipError && <p role="alert" className="text-xs text-destructive">{ipError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingIp(false); setIpDraft(""); setIpNameDraft(""); setIpError(""); }}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={!ipNameDraft.trim() || !ipDraft.trim()}>Save masked IP</Button>
                  </div>
                </form>
              )}
            </section>

            <section className="py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Whitelisted SSH public keys</h3>
                  <p className="mt-1 text-xs text-foreground-secondary">The public key is discarded after its fingerprint is generated.</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddingKey(true)}>
                  <RiAddLine className="size-4" />
                  Add new SSH keys
                </Button>
              </div>
              {keyEntries.length > 0 ? (
                <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
                  {keyEntries.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{entry.name}</span>
                        <span className="block truncate font-mono text-xs text-foreground-secondary">{entry.value}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Added by {entry.addedBy || addedBy}</span>
                      </span>
                      <button type="button" aria-label="Remove SSH public key" onClick={() => setKeyEntries((current) => current.filter((item) => item.id !== entry.id))} className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-muted-foreground">No SSH public keys added.</p>}
              {addingKey && (
                <form className="mt-3 space-y-2" onSubmit={(event) => { event.preventDefault(); void addPublicKey(); }}>
                  <label htmlFor="sftp-ssh-key-name" className="text-xs font-medium text-foreground">SSH key name</label>
                  <Input id="sftp-ssh-key-name" value={keyNameDraft} onChange={(event) => setKeyNameDraft(event.target.value)} placeholder="e.g. Production transfer key" autoFocus />
                  <label htmlFor="sftp-ssh-public-key" className="text-xs font-medium text-foreground">SSH public key</label>
                  <Textarea id="sftp-ssh-public-key" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} placeholder="Paste the SSH public key" rows={4} />
                  {keyError && <p role="alert" className="text-xs text-destructive">{keyError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingKey(false); setKeyDraft(""); setKeyNameDraft(""); setKeyError(""); }}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={!keyNameDraft.trim() || !keyDraft.trim()}>Save key fingerprint</Button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}