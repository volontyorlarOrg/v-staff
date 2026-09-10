# Volontyorlar — coordinator portal

## What Volontyorlar is

Volontyorlar helps high school students in Uzbekistan find volunteering that is
real and worth their time. It finds opportunities, contacts organisers, sources
events, builds partnerships, supplies volunteers, and is building regional
operations toward all 14 regions.

Do not call the product "Youth Volunteer Club", "YVC", "Youth Volunteering
Community", or "Volontyor". Verified facts about the organisation live in the
marketing repository (`../v-web/PRODUCT.md`); this portal presents none of them
and adds none of its own.

## Who this repository is for

A **coordinator**: the person who creates the volunteering a student applies to,
decides who is accepted, and confirms who turned up. One coordinator, their own
vacancies, and the volunteers who applied to them.

Coordinators do not sign themselves up. An administrator creates the account in
`v-admin` with a permanent password that the coordinator can keep using.

## The four repositories

| Repository  | Audience       | Owns                                                    |
| ----------- | -------------- | ------------------------------------------------------- |
| `v-web`     | the public     | brand, positioning, SEO, legal pages                    |
| `v-app`     | volunteers     | profile, applications, participation record             |
| `v-staff`   | coordinators   | **this portal**                                         |
| `v-admin`   | administrators | coordinators, organizations, global operations, audit   |
| `v-backend` | all four       | identity, sessions, data, and every rule that must hold |

## What a coordinator does here

```text
create a vacancy → publish it under a verified organization
  → applications arrive → read the profile as submitted and the answers
  → accept or reject, with a note the volunteer can read
  → the event happens → confirm who attended and for how many hours
  → the volunteer's participation record improves
```

Everything on every screen is scoped to that coordinator:

- the dashboard counts only vacancies they created;
- they create, edit, publish and archive only their own;
- they review only applications to their own vacancies;
- they confirm attendance only for people they accepted;
- they can search and open only volunteers who applied to them;
- the activity history holds only their own actions.

The scoping is the backend's. This portal shows it; it does not enforce it.

## Passwords

A coordinator can give a volunteer they are authorised to reach a **replacement**
temporary password, which forces that volunteer to choose a new one at the next
sign-in and ends their sessions. No screen requests, renders, caches or implies
access to an existing password, because no endpoint can return one.

## Audience and its consequences

The volunteers whose records pass through this portal are young people,
potentially including minors:

- collect and show the minimum, and never more than the API already holds;
- no personal data in URLs, analytics, or logs;
- no tokens in browser storage;
- every screen is private and never indexable.

## Languages

Uzbek (default), Russian and English. Every user-facing string exists in all
three and the language is carried by the URL.

## Needs verification

- The production origin of this portal.
- Whether coordinators are ever scoped by region as well as by ownership.
- How a coordinator is told their initial password, today, in practice.
