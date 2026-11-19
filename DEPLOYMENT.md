# Deployment and cost-safety status

**Current instruction: NO CLOUD DEPLOYMENT.** The owner explicitly prohibited transactions, payment methods, paid plans, and use of any account credits (including free/trial credits). Do not create or deploy cloud services, databases, domains, volumes, or other billable/credit-consuming resources.

## Verified state (19 November 2026)

- GitHub source v0.3.5 is merged into `main`; the latest CI run for that commit succeeded.
- Render service creation was attempted with the Free plan but Render returned HTTP 402, stating payment information is required. No service was created.
- Railway account connection and workspace discovery succeeded. A read-only project list returned zero projects. No Railway deployment was triggered and no Railway project/resource should be created under the current cost restriction.
- No production URL exists and no cloud deployment has been verified.

## Current zero-credit workflow

Use [OFFLINE_DEMO.md](OFFLINE_DEMO.md) to preview the UI locally from `public/index.html`. This mode uses browser storage only and disables AI/backend requests. It is not a hosted service and does not call Gemini.

## Future hosting

Do not proceed with hosting until the owner explicitly confirms that a specific hosting path will not use a payment method, charge, credit, free-trial credit, or usage balance. A provider's advertised "Free" tier is not enough evidence by itself. Before any creation or deployment call, verify the exact billing behavior and ask for renewed consent if the platform needs a credit balance or payment details.

The existing `render.yaml` is retained as historical deployment configuration; it is not an instruction to create a Render service. Never create a duplicate service automatically.
