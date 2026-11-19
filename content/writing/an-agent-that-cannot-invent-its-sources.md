---
title: "An agent that cannot invent its sources"
slug: "an-agent-that-cannot-invent-its-sources"
date: "2026-11-18"
lang: "en"
kind: "essay"
category: "engineering"
pair: "verifiable-citations"
summary: "Most retrieval demos fall apart the first time the model invents a page number. The fix is not a better model — it is a verifier the model cannot talk its way past."
tags: ["llm", "rag", "verification", "local-first", "python"]
repo: "gonzoblasco/localdoc-agent"
---

Every retrieval demo looks the same until it is wrong.

You upload PDFs, split them into chunks, embed, search by similarity, and pass the fragments to the model. It works. Then the model writes:

> "The contract expires on December 15, according to clause 4.2, page 3."

Clause 4.2 says something else. Page 3 does not exist. The model did not lie on purpose — it filled a gap with something that sounded probable. And since nobody checks, the wrong answer ships.

That is not a retrieval problem. It is a **verification** problem, and you do not fix it with a better model.

## The verifier has to be independent

The answer comes back as structured data: a `chunk_id` and a literal quote. The application does not trust the model. It checks the quote against the chunk.

```python
def verify_citations(citations, chunks_by_id):
    valid, invalid = [], []
    for cit in citations:
        chunk = chunks_by_id.get(cit["chunk_id"], "")
        if _normalize(cit["quote"]) in _normalize(chunk):
            valid.append(cit)
        else:
            invalid.append(cit)
    return valid, invalid
```

A citation is valid only if its quote is a substring of the chunk, after whitespace normalization. If it fails, the model gets one more attempt. If it fails again, the answer becomes a refusal.

This is not another language model checking the first one. It is string containment. Anyone can reproduce it by opening the database, and that is the point: **the verifier must not share a failure mode with the thing it verifies.**

## Three times it almost went wrong

This part is usually left out.

**The embeddings were fake and the tests were green.** The first version called `ollama embed`, a CLI subcommand that does not exist. Every call failed and silently fell back to a three-dimension mock vector. The tests passed because they checked structure, not values. The fix was not to improve the mock — it was to remove the fallback. A system that degrades silently is worse than one that breaks loudly.

**The vector search was not vector search.** `sqlite-vec` was never loaded, so `chunks_vec` was an ordinary table and the nearest-neighbour query was brute force. It worked with thirteen chunks and would have collapsed with thirteen hundred. I found it by reading `sqlite_master` instead of trusting the code that created it.

**A delegate reported files it never wrote.** Three times a subagent returned a delivery summary for a module that did not exist on disk. The lesson is procedural, not technical: run the repository before accepting a report. If the file is not there, the work is not there.

## The model is not the product

Everyone asks which model. The honest answer is that it matters less than the measurement.

| Model | Accuracy on 18 questions | Median latency |
|---|---:|---:|
| 12B, local | **18/18** | 49.5 s |
| 4B, local | 4/18 | 6.8 s |

The small model is seven times faster and four and a half times less accurate. Fine for a demo. Not fine for a contract.

One result nobody expects: a 9B model was **slower** than the 12B. It kept a 262k context resident and did not finish a single answer in ninety seconds. Parameter count is not latency. Measure on your machine, with your corpus, with your questions.

## What the model should not do

One question asked for the sum of two contract totals. The 12B failed it every time: it cannot add. The fix was eight lines of deterministic code. The agent retrieves and composes; the calculator sums.

The same principle, one layer down: **anything that can be verified by code should be, and anything left to the model should be stated as a guess.**

## What local-first means as a claim you can test

Three proofs, not three promises:

1. **Zero sockets.** During transcription and query, `lsof` shows no outbound connection.
2. **It can be deleted.** One button removes index, embeddings and drafts, verified on the filesystem.
3. **It is not rented.** In ten years the archive opens without a subscription.

And the consequence that is usually skipped: if the data does not leave, nothing comes in either. The model is local because privacy is the architecture, not a setting.

## What this project does not do

- It does not read scanned PDFs. It refuses them with an explicit message.
- It is not fast. Fifty seconds per answer with a 12B model.
- It does not scale. One person, one machine, one corpus.
- It does not have an independent benchmark. The eighteen questions were written by the person who wrote the system.

Saying this does not weaken the project. It makes it usable: a reader knows what they are getting, and a reviewer knows what is still missing.

The repository, including the failure log and the evaluation data, is at [localdoc-agent](https://github.com/gonzoblasco/localdoc-agent). Its sibling, about family voices instead of contracts, is [memoria-oral](https://github.com/gonzoblasco/memoria-oral).
