# Dataset and related-project review

Reviewed 2026-11-22. The goal is to select useful evaluation inputs for payment incident reconstruction, not to treat fraud labels as payment-system root-cause labels. Dataset licenses apply to the data and can differ from the simulator or loader code license. Recheck terms before redistribution or commercial use.

## Candidate datasets

| Resource | What it contains | How LedgerLens can use it | Important limits |
| --- | --- | --- | --- |
| [MoMTSim Synthetic Mobile Money Transaction Dataset, v2](https://data.mendeley.com/datasets/zhj366m53p/2) | Synthetic mobile-money records produced with a multi-agent simulator; Mendeley lists CC BY 4.0. | Best public starting point for validating payment amount, type, and transaction-pattern adapters and generating background traffic. | It is a transaction/fraud dataset, not a distributed processor trace: it does not provide our internal journals, webhook delivery history, settlement confirmations, or incident ground truth. Preserve attribution and license metadata. |
| [PaySim](https://www.kaggle.com/datasets/ealaxi/paysim1) | Synthetic mobile-money transactions inspired by aggregated private data; Kaggle metadata lists CC BY-SA 4.0. | Large-volume transaction noise, anomaly/fraud baselines, and amount/type distribution checks. | Fraud labels are not operational root causes. Its balance-related fields and fraud construction can make shortcuts possible; do not use them as a LedgerLens oracle. A derived dataset may need ShareAlike treatment. |
| [BankSim](https://www.kaggle.com/datasets/ealaxi/banksim1) | Synthetic bank payment transactions for fraud-analysis experiments. | Secondary source for transaction mix and non-mobile payment behavior. | Kaggle page metadata and redistribution terms must be checked at download time. It does not establish webhook, ledger, or settlement causality. Not integrated. |
| [IBM AMLSim](https://github.com/IBM/AMLSim) and [IBM AML-Data](https://github.com/IBM/AML-Data) | AMLSim is a multi-agent synthetic banking transaction generator with known laundering patterns. AML-Data publishes generated synthetic transactions and labels; repository documentation distinguishes its dataset terms. | Graph stress tests, adversarial transaction patterns, and evidence graph scale experiments. AML patterns must remain a separate task from payment incident diagnosis. | AML pattern labels do not mean funds are stuck, a journal is wrong, or a payment lifecycle transition failed. Check each repository and data license independently before reusing files. |
| [ULB / Worldline credit-card fraud dataset](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) | Anonymized card transactions with fraud labels, commonly used for highly imbalanced binary classification. | Optional anomaly detector comparison only, if data terms and access allow. | Anonymized features and fraud labels do not supply payment state, account postings, or causal evidence. It is a poor primary benchmark for this project's central task. |
| [AIOps Challenge 2020 data](https://github.com/NetManAIOps/AIOps-Challenge-2020-Data) | Operational metrics/log-like evidence and failure data from a cloud system. | Adapt generic partial/out-of-order evidence and incident timeline tests; benchmark evidence retrieval behavior outside finance. | The repository terms restrict use to non-commercial research/classroom purposes unless separately agreed. Do not put it in a public or commercial distribution without review. It has no financial semantics. |
| [RCAEval](https://github.com/phamquiluan/RCAEval) and [AIOpsArena dataset](https://github.com/AIOpsArena/dataset) | Microservice fault-injection / root-cause evaluation resources; AIOpsArena documents metrics, logs, traces, and injected-fault ground truth. | Optional future evaluation of generic root-cause ranking, evidence citation, and abstention under service failures. | These are software-service RCA cases, not payment incidents. Verify current dataset license and version before use; no copy or result is bundled here. |

## Recommendation for FinOpsBench

Keep the core FinOpsBench evaluation generated from LedgerLens's own seeded simulator. Only that generator can provide paired hidden ground truth and model-visible, incomplete payment events plus internal journal and settlement evidence. Split by scenario family and fault composition, not just random seeds, to reduce near-duplicate leakage.

Add optional import adapters for MoMTSim and PaySim as background transaction generators after a dataset card and license check. Imported transaction labels may be used only for the task they actually describe (for example, fraud detection); never relabel them as a payment outage or accounting root cause. Keep downloaded source files outside git. Store source URL, dataset/version, license, retrieval date, content hash, preprocessing version, split family, and excluded columns in each local manifest.

No third-party dataset has been downloaded, integrated, or evaluated by this repository yet. No benchmark score is claimed. The dashboard metrics currently describe only the local generated demo state.

## Related implementation projects

- [TigerBeetle](https://github.com/tigerbeetle/tigerbeetle) documents immutable transfers and integer-scaled balances. Useful as a financial-data-modeling reference; this prototype is not TigerBeetle and does not inherit its guarantees.
- [Modern Treasury ledger guarantees](https://docs.moderntreasury.com/ledgers/docs/ledgers-guarantees) documents balanced per-currency ledger transactions, immutability, idempotency, and locking. Use as a requirements checklist, not as a claim that this in-memory demo is production-safe.
- [OpenTelemetry Demo checkout service](https://github.com/open-telemetry/opentelemetry-demo/tree/main/src/checkout) is a useful service-boundary and observability example; its checkout simulation is not a financial ledger.
- [nepounds/reconcile](https://github.com/nepounds/reconcile) and [bowenzhu21/clearinghouse](https://github.com/bowenzhu21/clearinghouse) are adjacent open-source ledger/reconciliation examples. Inspect their current code and licenses before borrowing implementation details.

## Evaluation coverage mapping

| Evaluation question | Preferred evidence |
| --- | --- |
| Did a payment become stuck or contradictory across services? | LedgerLens simulator with hidden lifecycle ground truth; no reviewed public dataset fully covers this. |
| Did a ledger posting duplicate or fail to balance? | Generated journals plus deterministic invariant tests; external transaction datasets lack a verified journal. |
| Can a model rank fraud-like transactions? | PaySim / MoMTSim with task-specific labels and leakage checks. This is a separate model task. |
| Can evidence tools reason over noisy service telemetry? | AIOps Challenge / RCAEval adapters after license review; report separately from FinOpsBench payment results. |
| Does a recovery preserve financial invariants? | Isolated LedgerLens state replay and deterministic constraints; never infer correctness from dataset labels. |
