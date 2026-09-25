# Today

`/dashboard` is where a coordinator lands, and it is their desk, not a report:
one register sheet of what waits on them, each entry carrying its own action,
then what they cleared today, then their work's totals in one line.

Every rule below is a pure function in `src/lib/queue/today.ts`, tested beside
it; the page only renders what those functions return. The file is shared with
`v-admin`, whose Today uses the administrator's functions from it.

## On the desk

| Section                | An entry is                                                                                                    | Order                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Returned for changes   | one of their vacancies an administrator sent back, with the administrator's note and what approval still needs | most recently returned first   |
| Drafts to send         | one of their drafts, with what approval still needs                                                            | most recently saved first      |
| Applications to decide | a `submitted` or `under_review` application to one of their vacancies that is not archived                     | oldest first, the first twelve |
| Roll calls due         | one of their vacancies whose event has ended and still has an accepted volunteer unrecorded                    | earliest ended first           |

A returned vacancy and a draft each carry Edit, which opens the vacancy's own
edit page, and Send for approval, an `InlineDecision` that stays disabled until
nothing is missing. Accept, Reject and Mark under review come from
`src/lib/queue/decisions.server.ts`, the same builders `v-admin` uses. A roll
call links to the vacancy's roster. Under the sections, one line says how many
vacancies are with an administrator and links to them; they wait on someone
else, so they are not counted in the dateline.

## Cleared today

The coordinator's own decisions on the current Tashkent calendar day, newest
first: applications they accepted, rejected or closed, and roll calls they
recorded, folded into one entry per vacancy. Each carries a seal; a decision
made in the last twenty seconds presses its seal.

## Your work

`/staff/statistics` supplies the totals line — live vacancies, applications
sent, volunteers accepted, events attended and confirmed hours — and the waiting
counts on the rail. If statistics fail, the desk still renders; only the line and
the counts are missing.
