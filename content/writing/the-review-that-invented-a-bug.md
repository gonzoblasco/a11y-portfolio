---
title: "The review that invented a bug"
slug: "the-review-that-invented-a-bug"
date: "2026-11-19"
lang: "en"
kind: "essay"
category: "engineering"
pair: "review-invented-bug"
summary: "A review of my own work found five real defects and one that did not exist. The sixth is the useful one: a failing command confirmed the story I had already written instead of challenging it."
tags: ["verification", "testing", "tooling", "process", "agents"]
---

A review of my own work found five real defects and one that did not exist.

The five were mechanical. A package name that still said the old project. A lockfile repeating it. A program identifier that disagreed with its own filename. A test count written as 10 in two different files while the suite ran 25. A virtualenv whose prompt still printed the name from before the rename.

All five were green. All five shipped. All five were fixable in an afternoon.

The sixth is the one I keep.

## The number nobody measured

The rule is simple: a file that gets loaded on every boot has a size limit. Mine said 20,000 characters.

The task list said the file was at 19,997. Comfortable. Three characters of margin, which is a strange thing to be proud of, but there it was.

I measured it instead of reading the number. 20,131.

```
last commit:  19,889
working tree: 20,131
cap:          20,000
```

The repository was 111 characters under. The disk was 131 over. The loader reads the disk.

That gap is the whole article in miniature. The file was not "slightly over budget". It was **quietly truncated every single time it loaded**, and the only artifact that would have shown it was a number nobody had recomputed since it was written.

A budget you check once is a wish. The reason it drifted is more interesting than the number.

## The audit behind the number

When I opened the file to trim it, the content explained itself. Two sections were describing a world that no longer existed.

One was a procedure for publishing a public skills repository. That repository had been archived months earlier. The procedure was correct, detailed, and completely inert: nobody could follow it, because the thing it operated on was gone.

The other documented a three-layer project layout with an intermediate aggregate repository. That layer had been retired in a decision record. The file still described it as current, complete with a debt list whose four items had all been paid.

So the file was over budget for a reason worse than verbosity: it was accurate about the past. Every line was true when written, and the file kept its authority after the truth expired.

I removed about a third of it and the operational rules survived intact. That is the tell. Content that cannot be deleted without consequence is load-bearing. Content that evaporates in an afternoon was archaeology.

## Renaming is not `mv`

The same week I renamed a project. The repository, the directory, the docs. I called it done and moved on.

Then I reviewed my own work the way I would review a stranger's, and found that a rename has about seven layers:

1. the directory
2. the git remote
3. the distribution name in `pyproject.toml`
4. the lockfile that repeats it
5. the state files keyed by the old identifier
6. the environment artifacts created before the rename
7. the prose

I had done four. The package still called itself `agente-local-amigo` while living in `localdoc-agent`. The lockfile agreed with the package. The planner's program file was named after the new project and declared the old identifier inside, so the tooling could find it but reported the wrong name back. And the virtualenv prompt still printed the old one, because I had created it three commands before the rename.

None of that breaks a test. All of it breaks a reader.

Two of the five defects were also copies. "10 tests" appeared in a project map and in a curated memory file, and the true count was 25. Fixing one would have left the other lying, and the next person would have found the stale one first.

## The sixth defect

Here is where the review went wrong.

The planner program had been called `agente-local-lucia`. I renamed the file to `localdoc-agent.json` and left the identifier inside untouched, so the command that looks programs up by name failed:

```
status agente-local-lucia  ->  No existe el programa
```

I wrote that into the review as proof of a "naming debt between the repository and the product". It read well. It had a terminal transcript. It matched the pattern of the other five.

It was wrong. Lucía is a persona from the exercise brief, not a client, and that identifier never named the product at all. The command failed for a perfectly ordinary reason — the file had been renamed and the key had not — and I attached a story to it that the evidence did not support.

The failure was real. The diagnosis was invented.

That is the failure mode I had been writing about for weeks without noticing I was inside it. A red output confirms that something is broken. It does not confirm your explanation of what. The transcript felt like proof because it was concrete, and concrete is not the same as correct.

## The test that hung

The next task was to turn a privacy promise into something that can fail. Both projects claim that nothing leaves the machine. The old evidence was `lsof` sampled nine times on one laptop at one moment.

So I wrote a probe: run the real code paths in a subprocess under Python's audit hook, record every `socket.connect`, `socket.getaddrinfo` and `socket.gethostbyname`, and fail on anything that is not loopback. DNS counts. Resolving a name is already traffic.

Then I added the piece that makes it a test instead of a sticker: a positive control. One workload deliberately connects to `example.com`, and the suite fails if the hook does **not** catch it.

```
{"violations": [{"event": "socket.getaddrinfo", "target": "'example.com'"},
                {"event": "socket.connect", "target": "('2606:4700:10::6814:179a', 80, 0, 0)"}],
 "clean": false}
```

A real Cloudflare IPv6 address, caught by name and by destination.

Then the suite hung.

The Ollama workload called `chat` with a model that was not downloaded. The Python client stayed on loopback, as designed — but the Ollama daemon, on the other end of that loopback connection, went to the registry to fetch the model. That traffic is real, it left the machine, and the hook could not see it, because it happened in a different process.

The instrument I had built to prove that nothing leaves the machine could not see the one thing that left.

I removed the model call from the probe and wrote the limitation into both READMEs: the hook audits Python sockets, subprocesses are outside it, and a missing model makes the daemon fetch. The honest claim is narrower than the one I wanted. It is also the only one that survives being checked.

The same task turned up a worse defect than the one I had predicted. I expected the delete endpoint to leave SQLite's `-wal` and `-shm` files behind. It did. It also left `data/private/`, the directory where every uploaded original gets copied before parsing. A button labelled "Delete everything" was deleting the index and keeping the contracts.

## What green means

The bilingual work had the same shape. Three essays needed Spanish versions, and the generator already supported pairs: a shared key, `hreflang` alternates, `x-default` pointing at the original.

The build passed. Then:

- the feed emitted one entry per page, so every translation appeared twice;
- the index showed an "In Spanish" badge on translations, so an English reader never learned a Spanish version existed;
- and a pair key that matched nothing failed silently, deleting both the `hreflang` and the visible switch while the build stayed green.

That last one is the same bug as the invented diagnosis, wearing different clothes. I had written in my own plan that broken pairs already failed the build. They did — two articles in the same language, or three in one pair. Not one. A pair with a single half was invisible, and the plan said it was covered, so nobody looked.

Now the build fails with the identifier and the slug:

```
build: pair "bogus-test" has only one article; "un-anuncio-mas-silencioso" points at nothing
```

I tested it by breaking a pair on purpose and restoring it. The check that matters is the one you have watched fail.

## The rule

Two rules, and they are the same rule.

**Measure the owner, not the copy.** The committed size, not the remembered one. The element that carries the role, not the props object that produced it. The program identifier the tool actually reads, not the filename that looks right. Every one of the five mechanical defects was a copy that had drifted from its owner.

**Evidence confirms the symptom, not the explanation.** A failing command proves that something is wrong. It does not prove that you know what. The invented defect survived because it had a transcript, and a transcript is not a diagnosis.

The two defects that cost the most this week were not on my risk list. One was a delete button that kept the originals. The other was a test that could not see the process it was testing. Both were found by running the thing and reading the output, not by predicting what could go wrong.

A plan's list of known risks is a list of guesses with good formatting. It feels like preparation because it is specific. The specificity is the problem: it tells you where to look, and the defect is usually somewhere else.

Ask what the artifact does. Not what the document says it does.
