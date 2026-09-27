# NWTS — Speaker notes

Use slides 1–10 for the main conversation. Keep slides 11–14 for detailed questions. The live demonstration can follow the scenario on slide 14.

## 1. Nuclear Waste Tracking System

NWTS connects shipment information with pre-storage and final-storage workflows. This presentation introduces the current software prototype and a proposed pilot approach. The cover is a conceptual illustration, not a real facility or a container specification.

## 2. Operational information in context

Introduce the operational questions before showing individual features. NWTS brings records from three work areas into one organisation. Employees work in their assigned area, while Supervision and Administrator accounts can review all three. The intended benefit is easier coordination and a clearer view of pending work. No measured time or cost savings are claimed. Ask the audience which of these questions is hardest to answer in their current process.

## 3. Three connected work areas

Explain the three work areas in order. Step 1 records the truck and its contents. Step 2 receives container quantities into a hall and handles the pre-storage side of transfers. Step 3 requests a transfer and confirms final receipt. A truck departure is a separate event: OUT means that the truck left the unloading zone. It does not prove final disposal. The screenshot illustrates the application’s process overview with demo figures.

## 4. Step 1: Shipment records

Use the sample shipment with 27 containers to make the record tangible. A Shipping employee records arrival and truck information. Supervision or an Administrator prepares the Container Profiles using existing definitions. One profile groups a quantity of containers with shared attributes. It is not an individual serial record for every physical container. After departure, only the Administrator can perform the permitted shipment corrections. Content entry alone does not confirm physical receipt.

## 5. Step 2: Pre-storage

Show the hall overview and then open a hall. Explain the distinction between recording arrival at the site and accepting containers into storage. Receipt links connect the incoming profile to a hall. Transfer processing uses recorded sources and quantities. Capacity figures use configured floor area and container footprint, so they are planning indicators, not a validated storage layout. Demo counters reflect the current dataset, not the proposed full demonstration scenario.

## 6. Step 3: Final storage

Walk through the direction of the transfer. The final-storage area starts the request, the pre-storage area responds, and final storage confirms receipt. The software checks permitted transitions and recorded quantities. This is the application’s final-storage record workflow. It does not itself certify physical emplacement or compliance with a facility’s acceptance criteria. For a live demonstration, use compatible demo definitions and a small quantity from a linked receipt.

## 7. Conditions and follow-up

Explain that a user records a measurement and the application compares it with configured ranges. Alerts can track acknowledgement, notes, return to range and closure. Critical alert closure requires a management role and the applicable closure conditions. Rules carry an approval reference. Default demo values do not establish operational limits. Escalation evaluation occurs when the application is used. An always-running background notification service and sensor integration are outside the current implementation.

## 8. Roles and responsibilities

Distinguish role from work area. An Employee belongs to Shipping, Pre-storage or Final storage. Supervision and Administrator accounts can access all three areas, but their editing rights differ. Supervision creates Employee accounts and prepares Container Profiles. The Administrator manages definitions and existing accounts and has additional correction rights. Responsible-employee records attached to a hall or room are operational records and are not automatically the same as login accounts. The appendix contains a more detailed permission summary.

## 9. Current scope and next development

Present the software as a functional prototype. The current repository includes stock verification, correction reports, linked receipts, transfer sources and alert events in addition to the older concept document. These records improve visibility, but they do not establish a complete, independently validated audit trail for every historical or physical container. Integrations and site validation require separate scope. Avoid claims of certification, guaranteed safety or production readiness. Agree which gaps matter to the prospective partner.

## 10. A focused pilot

Propose a limited pilot rather than a broad implementation commitment. Ask the partner to nominate an operational owner and describe one representative scenario. Agree success criteria before work begins: whether records can be found, quantities reconcile, the right users can act and exceptions remain visible. Deployment, integrations, pricing and project duration need separate agreement. A technical partner may focus on integration boundaries, while a prospective user may focus on everyday tasks.

## 11. Function overview: operations

This inventory summarises the current software rather than contractual deliverables. Records may contain multiple containers with shared attributes. Newer receipt and transfer links support source tracking. Older data can lack these links and the application exposes those limitations. The shipment activity view covers selected event types and bounded result lists. It should not be described as a universal immutable audit log. Final acceptance criteria belong in the pilot scope.

## 12. Function overview: oversight

Explain the oversight functions only as far as they relate to the audience. Stock reconciliation compares a recorded count with the system quantity and supports an Administrator correction report. It does not prove the physical count. A supported legacy link records an explicit reconciliation decision, rather than guessing an origin. Statistics describe recorded movements and quantities. Capacity uses configured area and footprint. Interface translation does not translate user-entered names or every historical free-text note.

## 13. Permission summary

Use this table to answer detailed access questions after the main presentation. All permissions apply inside the user’s organisation. Access to a work area does not allow every action. Accepted profiles, active transfer states and other record constraints can limit changes. Employees can record measurements in their own area. Critical alert closure is reserved for Supervision or Administrator accounts and still requires the closure checks. The current Employee model assigns one work area, not multiple temporary assignments.

## 14. Demonstration: one shipment

Prepare the demonstration before the meeting. Use dedicated test locations with compatible definitions, sufficient configured capacity and responsible-employee records. Prepare the five demonstration accounts: Administrator, Supervision and one Employee for each step. Create a fresh shipment rather than altering existing examples. Receive all 27 containers, then transfer 5 from the first group. With zero initial stock and no other movements, the final balance is 22 in pre-storage and 5 in final storage. The screenshots show the existing demo dataset and do not assert completion of this scenario.
