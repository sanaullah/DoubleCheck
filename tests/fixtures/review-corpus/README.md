# Review-quality corpus

The versioned corpus under `v1/` is an offline release gate for the BoxLang
review pipeline. Its manifest defines:

- source fixtures;
- expected rule, file, and exact line spans;
- deterministic structured AI responses;
- minimum precision, recall, F1, and citation-validity thresholds;
- maximum duplicate and false-positive rates.

`EvaluationGateSpec.bx` runs the normal prompt construction, secret redaction,
AI finding normalization, evidence validation, deterministic checks,
deduplication, and metric calculation without making a network request.

Add new cases without changing existing expected outcomes. Raise thresholds
only in the versioned manifest and review metric changes as product behavior
changes.
