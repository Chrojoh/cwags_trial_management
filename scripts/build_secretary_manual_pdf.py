from __future__ import annotations

from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / "docs" / "secretary-manual-assets" / "annotated"
OUTPUT = ROOT / "output" / "pdf" / "CWAGS_Trial_Secretary_Manual_1.2.pdf"

ORANGE = colors.HexColor("#E65600")
BROWN = colors.HexColor("#5A2D0C")
PALE = colors.HexColor("#FFF4C9")
PALE_BLUE = colors.HexColor("#EAF1FF")
GREEN = colors.HexColor("#2F9E44")
GRAY = colors.HexColor("#5F6368")


class ManualDoc(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=letter,
            rightMargin=0.65 * inch,
            leftMargin=0.65 * inch,
            topMargin=0.65 * inch,
            bottomMargin=0.62 * inch,
            title="C-WAGS Trial Secretary Manual",
            author="C-WAGS Trial Management",
            subject="Secretary operations and event-day reference",
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="normal")
        self.addPageTemplates(PageTemplate(id="manual", frames=[frame], onPage=self.draw_page))

    def draw_page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#E8D29A"))
        canvas.line(self.leftMargin, 0.48 * inch, letter[0] - self.rightMargin, 0.48 * inch)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(GRAY)
        canvas.drawString(self.leftMargin, 0.30 * inch, "C-WAGS Trial Secretary Manual | Secretary Edition")
        canvas.drawRightString(letter[0] - self.rightMargin, 0.30 * inch, f"Page {doc.page}")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ManualTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=BROWN, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="ManualSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=14, leading=18, textColor=GRAY, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=BROWN, spaceBefore=4, spaceAfter=8, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=ORANGE, spaceBefore=7, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.2, leading=14.2, textColor=colors.HexColor("#242424"), spaceAfter=6))
styles.add(ParagraphStyle(name="Stepx", parent=styles["BodyText"], fontName="Helvetica", fontSize=10.1, leading=14, leftIndent=18, firstLineIndent=-14, textColor=colors.HexColor("#242424"), spaceAfter=4))
styles.add(ParagraphStyle(name="Captionx", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=8.7, leading=11, textColor=GRAY, alignment=TA_CENTER, spaceBefore=3, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.8, leading=12, textColor=colors.HexColor("#303030"), spaceAfter=3))


def p(text: str, style: str = "Bodyx") -> Paragraph:
    return Paragraph(text, styles[style])


def steps(*items: str):
    return [p(f"<b>{i}.</b> {item}", "Stepx") for i, item in enumerate(items, 1)]


def note(label: str, text: str, color=PALE_BLUE):
    table = Table([[p(f"<b>{label}</b> {text}", "Smallx")]], colWidths=[7.05 * inch])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#B7C7E8")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def figure(filename: str, caption: str, max_height: float = 5.15 * inch):
    path = IMAGES / filename
    with PILImage.open(path) as im:
        width_px, height_px = im.size
    max_width = 7.05 * inch
    scale = min(max_width / width_px, max_height / height_px)
    image = Image(str(path), width=width_px * scale, height=height_px * scale)
    return KeepTogether([image, p(caption, "Captionx")])


def section(title: str, intro: str, step_items: tuple[str, ...], image: tuple[str, str] | None = None, extra=None):
    flow = [p(title, "H1x"), Spacer(1, 4), p(intro)]
    flow.extend(steps(*step_items))
    if extra:
        flow.append(extra)
    if image:
        flow.extend([Spacer(1, 6), figure(image[0], image[1])])
    flow.append(PageBreak())
    return flow


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    story = []

    story.extend([
        Spacer(1, 0.75 * inch),
        p("C-WAGS Trial Secretary Manual", "ManualTitle"),
        p("Secretary Operations and Event-Day Reference Guide", "ManualSubtitle"),
        Spacer(1, 0.25 * inch),
        note("Scope.", "This manual is written solely for trial secretaries. It follows the secretary workflow from trial creation and approval through entry management, event-day operations, financial record keeping, reports, and closing.", PALE),
        Spacer(1, 0.35 * inch),
        p("Version 1.2", "H2x"),
        p("Prepared from the current local secretary application using a fictional training trial and fictional competitors. Screenshots are annotated and account details are replaced with examples."),
        Spacer(1, 1.4 * inch),
        p("Production address", "H2x"),
        p("https://cwagstrialmanagement.vercel.app"),
        p("Use the production address for live work. Use localhost only for authorized local testing."),
        PageBreak(),
        p("Contents", "H1x"),
    ])
    contents = [
        "1. Role, access, and navigation", "2. Create a trial", "3. Select days and classes",
        "4. Configure rounds and judges", "4A. Trial application and approval", "4B. Trial collaborators and staff roles", "5. Publish and manage entries", "6. Waitlists and capacity",
        "7. Running order and event-day controls", "7A. Scent score-sheet export", "8. Score entry and corrections", "9. Time calculator",
        "10. Financial record keeping", "10A. Judge and volunteer reduced rates", "11. Activity journal", "12. Reports and closing", "12A. Summary export workbook",
        "13. Troubleshooting and final checklist",
    ]
    for item in contents:
        story.append(p(item, "Stepx"))
    story.extend([Spacer(1, 10), note("Privacy.", "Do not place real passwords, private registry data, or unnecessary personal information in screenshots or exported training material."), PageBreak()])

    story += section(
        "1. Role, access, and navigation",
        "A trial secretary works only with assigned trials. The left sidebar lists those trials and exposes the operational pages needed for setup, entries, event-day work, summaries, and record keeping.",
        ("Sign in with the secretary account provided by the administrator.", "Choose the correct assigned trial from the sidebar.", "Verify the trial name before changing entries, running order, scores, or financial records.", "Use the breadcrumb and sidebar to return to Trial Details."),
        ("01-secretary-dashboard-annotated.png", "Secretary dashboard and assigned-trial navigation."),
    )
    story += section(
        "2. Create a trial",
        "Create the event shell first. Dates entered here define the available calendar range; the actual trial days are selected on the next screen.",
        ("Select Create New Trial.", "Enter the trial name, host club, venue, city, province/state, and country.", "Select the opening and closing dates from the calendar controls.", "Review the auto-filled secretary details and default fees.", "Save and continue."),
        ("02-create-trial-basic-info-annotated.png", "Basic trial information and default settings."),
        note("Important.", "Default fees may be adjusted by class later. Max entries are controlled at the class/round level; a day-level maximum is not used."),
    )
    story += section(
        "3. Select days and classes",
        "The calendar range may include non-trial dates. Select only the dates on which classes will actually run, then choose the offered classes for each day.",
        ("Click each actual trial date.", "Confirm the selected-day list on the right.", "Choose the category and levels for Day 1, then repeat for every day.", "Set class fees, FEO availability, and class capacity where shown.", "Save and continue after reviewing every day."),
        ("04-select-trial-days-annotated.png", "Actual trial-day selection."),
    )
    story += [p("Class selection", "H2x"), p("Class names should follow the program's standard order. Classes not offered in the trial are omitted."), figure("05-choose-classes-and-levels-annotated.png", "Classes, fees, and class-specific options."), PageBreak()]

    story += section(
        "4. Configure rounds and judges",
        "Rounds are configured by day and class. Judges are selected here, not on the initial trial form.",
        ("Select a trial day and class.", "Add the required rounds and assign the judge to each round.", "Set round capacity.", "Leave Start Time and Estimated Duration blank when they are not needed; they are planning aids only.", "For a reset, create the half-round and assign its judge once on that round card.", "Save progress before changing day or class."),
        ("06-rounds-judges-and-reset-annotated.png", "Round, judge, reset-round, and optional planning fields."),
        note("Reset judge.", "The reset round is an actual separate round. A judge selected for the reset round should not need to be entered twice."),
    )
    story += section(
        "4A. Trial application and approval",
        "After configuration is complete, generate the Trial Application while the trial is still in Draft. Submit the completed PDF to C-WAGS and wait for approval before publishing the trial or opening entries.",
        ("Review the configured days, classes, rounds, judges, fees, capacities, host, dates, and location.", "Open Trial Application and complete any application-only information.", "Download the completed PDF and submit it to C-WAGS for approval.", "Keep the trial in Draft while approval is pending.", "After approval, return to Trial Details, publish the trial, and open entries when the host is ready."),
        ("20-trial-application-annotated.png", "Generate and submit the Trial Application while the trial remains in Draft."),
        note("Separate actions.", "Generating the application does not publish the trial. The trial does not need to be published before the application is produced."),
    )
    story += section(
        "4B. Trial collaborators and staff roles",
        "Trial Collaborators give another registered user access to one selected trial. The person who created the trial is its owner; only the owner or an application administrator controls invitations, role changes, removal, and trial deletion.",
        ("Open Trial Collaborators from the selected trial's sidebar menu.", "Enter the registered user's email address and select the least-privileged role that fits the assignment.", "Send the invitation and have the person sign in and accept it.", "Remove or reduce access when the assignment ends."),
        None,
        KeepTogether([
            note("Secretary.", "May edit trial setup; manage entries, waitlists, running order, and scores; manage financial records; and generate reports and the Trial Application. An invited secretary cannot manage collaborators or delete the trial."),
            Spacer(1, 6),
            note("Assistant.", "May view the trial and help with entries, waitlists, running order, and scoring. An assistant cannot change setup, manage financial records, generate reports or the Trial Application, manage collaborators, or delete the trial."),
            Spacer(1, 6),
            note("Choosing a role.", "Use Assistant for event-day help. Use Secretary only when the person must configure the event or use financial and official reporting functions. The assignment does not expose unrelated trials."),
        ]),
    )
    story += section(
        "5. Publish and manage entries",
        "Publish only after the Trial Application has been approved and the configured days, classes, rounds, judges, fees, and capacities have been reviewed. Entry controls determine whether the public form is visible, open, or closed.",
        ("Confirm that C-WAGS approval has been received.", "Publish the trial from Trial Details.", "Set the trial-wide entry status to Open for Entries when the host is ready.", "Use per-day controls when one day must close before another.", "Open Entries to review submitted, confirmed, and waitlisted records.", "Use search and status filters before making changes."),
        ("12-entry-management-populated-annotated.png", "Populated secretary Entries page with fictional competitors."),
        note("Financial status.", "The application records charges and balances. It does not collect or process credit-card payments."),
    )
    story += section(
        "6. Waitlists and capacity",
        "Waitlisting occurs at the individual round-selection level. A dog may have accepted rounds and waitlisted rounds in the same entry.",
        ("Open View Selections for the competitor.", "Confirm which rounds are active and which are waitlisted.", "Waitlisted selections must have no running position and a current fee of $0.", "Increase round capacity only when the host approves another spot.", "Promote the intended dog; if it is not first chronologically, review and accept the warning only when justified.", "Verify the fee and running position after promotion."),
        ("13-waitlist-management-annotated.png", "Selection-level waitlist details and promotion controls."),
    )
    story += [p("Capacity at the live event", "H2x"), p("Changing capacity does not automatically promote a waitlisted dog. This separation prevents accidental charges and preserves secretary control."), figure("14-running-order-capacity-waitlist-annotated.png", "Round capacity, chronological waitlist, and promotion controls."), PageBreak()]

    story += section(
        "7. Running order and event-day controls",
        "The live-event page is the working screen for event day. Select the correct day, class, and round before changing a dog.",
        ("Open Running Order & Score Entry.", "Select the day and class card.", "Confirm the judge and active-entry count.", "Use drag-and-drop, arrows, or keyboard controls to adjust running order.", "Use the dog menu to check in, mark present, mark absent, scratch, or undo check-in.", "Export the running order or score sheet only after positions and statuses are correct."),
        ("14-running-order-capacity-waitlist-annotated.png", "Running order setup with active positions and event-day controls."),
        note("Waitlisted dogs.", "Waitlisted selections do not appear in the active running order or exported score sheets until promoted."),
    )
    story += section(
        "7A. Scent score-sheet export",
        "The Scent Score Sheet export prepares the working score sheets for one selected trial day. Generate it only after the running order and event-day statuses are correct.",
        ("Open Running Order & Score Entry and remain on Running Order Setup.", "Confirm active competitors, running positions, class, round, and judge.", "Select Export Scent Score Sheets.", "Choose the required trial day; the workbook is downloaded for that day.", "Review every worksheet before printing, especially the date, class, round, judge, running order, registration number, dog, and handler.", "Print only the worksheets needed at ringside and retain the electronic file with the trial records."),
        ("25-score-sheet-export-day-selection-annotated.png", "Select the trial day for the scent score-sheet workbook."),
        note("Workbook contents.", "The selected day produces a worksheet for each configured class/round. Active scorable competitors are listed in running order, FEO dogs are labelled, and scoring areas are left ready for the official. Waitlisted, withdrawn, absent/no-show, and scratched selections are excluded."),
    )
    story += section(
        "8. Score entry and corrections",
        "Score entry varies by program. Scent and Games normally use Pass/Fail; Rally and Obedience may use qualifying numerical scores. A blank means no result was provided.",
        ("Select Score Entry for the correct round.", "Enter Pass/Fail for Scent and Games.", "Enter the qualifying number for Rally or Obedience when provided; preserve the numerical value.", "Use NQ for an explicit non-qualifying result; do not convert a blank to NQ.", "Record ABS when the dog was absent.", "Save all scores and verify the result beside the dog.", "Use the correction workflow for later changes so the journal retains before-and-after values."),
        ("16-score-entry-completed-annotated.png", "Completed scent score-entry example."),
    )
    story += section(
        "9. Time calculator",
        "The time calculator estimates each day's schedule from entries and time per run. It is a planning tool, not a required score or round field.",
        ("Select the trial day.", "Expand the day to review each class.", "Enter whole minutes and seconds per run, such as 1 minute 45 seconds.", "Review used time, daily allotment, and remaining time.", "Recalculate after material entry changes."),
        ("21-time-calculator-annotated.png", "Minutes-and-seconds time configuration and daily totals."),
    )
    story += section(
        "10. Financial record keeping",
        "Financial Summary records fees, waivers, offline payment status, expenses, and balances. It is not an online payment processor. The Break-Even page stores the trial's financial assumptions, including the current C-WAGS fee charged for each regular run.",
        ("Confirm accepted runs and waitlisted $0 selections before reviewing totals.", "Open Break-Even Analysis.", "Enter the current published amount in C-WAGS Fee (per run).", "Review the other assumptions and select Save Configuration.", "Wait for the save confirmation before leaving the page.", "Return to Expenses & Payments and enter the host-approved Volunteer / Reduced Entry Rate per run.", "Select Save before marking any person J/V.", "Use the J/V checkbox for an approved reduced rate, or Waive with a reason for a full waiver.", "Verify the recalculated total and balance before recording an offline payment.", "Record expenses with a clear description and payee.", "Reconcile Financial Summary against Entries and the Activity Journal."),
        ("19-financial-summary-annotated.png", "Financial record-keeping screen."),
        note("Saved C-WAGS calculation.", "The configuration is saved for that trial. When the secretary returns, the saved fee is loaded again and the C-WAGS amount is recalculated from the current active regular runs. Accepted and promoted regular runs count; waitlisted runs remain $0 until promoted. A waived regular run still creates a C-WAGS cost to the club. FEO runs are kept separate. For example, 120 active regular runs at $X per run produces 120 x $X owed to C-WAGS. Enter the current published fee in place of $X and recheck after entry changes."),
    )
    story += section(
        "10A. Judge and volunteer reduced rates",
        "A judge or volunteer does not receive reduced entry fees automatically. The secretary chooses the treatment authorized by the host club: leave the normal fee, apply the saved J/V reduced rate, or document a full waiver.",
        ("For the full fee, leave J/V clear.", "For a reduced fee, open Expenses & Payments, enter the approved Volunteer / Reduced Entry Rate per run, and select Save.", "Find the approved person in the payment table and review the dogs and runs grouped in that row.", "Select J/V to recalculate the affected entry fees and balance.", "Verify the new balance before recording any offline payment.", "If eligibility changes, clear J/V to restore the normal entry fee.", "For a full waiver, use Waive and enter the reason instead of treating the waiver as an ordinary discount."),
        ("28-reduced-rate-workflow-annotated.png", "Save the approved rate first, then select J/V on the eligible competitor row."),
        note("When to apply it.", "Apply the benefit after the judge or volunteer assignment and host policy are confirmed, but before payment is recorded. Changing the saved reduced rate later does not automatically reprice rows already marked J/V; clear and reselect J/V for each row that must be recalculated. Review FEO selections separately and do not assume the visible regular-run rate is the intended FEO rate. Judge compensation under Trial Expenses is separate: a judge expense does not reduce the judge's entries, and J/V does not create a judge expense. Use a $0 rate only deliberately; use Waive when a full waiver and its reason must be documented. Never enter payment secrets in the program."),
    )
    story += section(
        "11. Activity journal",
        "The Activity Journal is the audit trail for entry changes, waitlisting, promotion, capacity, fees, running order, and scores.",
        ("Filter by person, dog, registration number, action type, or date.", "Check the user and timestamp.", "Read the concise action description.", "Expand before-and-after details for a score correction, fee change, or running-order change.", "Use the journal with the current entry record; historical snapshots should not be treated as the current live entry."),
        ("17-activity-journal-annotated.png", "Chronological audit entries with filters and detail controls."),
    )
    story += section(
        "12. Reports and closing",
        "Class summaries, exports, and closing checks are used after event-day work is complete.",
        ("Check the class summary for entered runs, completed runs, passes, fails/NQ, and absences.", "Resolve every missing result that should have been recorded.", "Export the final class summary/recap workbook.", "Reconcile financial records and journaled adjustments.", "Retain the exports and required paperwork with the host's trial records."),
    )
    # Keep the related Summary export subsection on the same page when space
    # permits instead of leaving most of the reports-and-closing page empty.
    story.pop()
    story += section(
        "12A. Summary export workbook",
        "The Summary page is the reconciliation checkpoint before producing the official Excel workbook. Review the screen first; exporting does not repair missing or incorrect results.",
        ("Select All Classes and compare Runs, Rounds, Pass, F, Abs, Completion Rate, and Pass Rate.", "Remember that Runs are entered regular selections, while Completed Runs require a recorded Pass, F/NQ, or Abs result.", "Open an individual class when a total needs investigation across its rounds.", "Correct missing or incorrect scores in Score Entry and confirm the Activity Journal.", "Return to Summary and verify that the totals now reconcile.", "Select Export to Excel and save the workbook with the host's final trial records."),
        ("26-summary-export-overview-annotated.png", "All-class reconciliation and the Summary export control."),
        note("Excel workbook.", "The export preserves the official template with the Directions sheet, Trial Recap, and one sheet for each class that has recorded results. Qualifying numerical scores remain numbers; Pass, F/NQ, and Abs remain explicit results; a dash represents an unrecorded run. Open the workbook in Excel so formulas recalculate, then review the recap and class print areas before submitting or printing."),
    )
    story += [p("Final class totals", "H2x"), p("The completion rate explains the difference between entered runs and recorded results. A run with no score remains incomplete; an explicit fail/NQ must be counted as a result."), figure("18-class-summary-annotated.png", "All-class result reconciliation before export."), PageBreak()]

    story.extend([
        p("13. Troubleshooting and final checklist", "H1x"),
        p("Use this checklist before contacting the administrator. Preserve the active trial and gather evidence first."),
    ])
    checks = [
        "Confirm the correct trial, day, class, and round.",
        "Refresh once and reproduce the issue without repeated clicks.",
        "Record the exact visible message and the action immediately before it.",
        "Compare Entries, Live Event, Financial Summary, and Activity Journal.",
        "Do not access Supabase or run SQL. Secretaries must send the evidence to the administrator for any database investigation or repair.",
        "Do not delete journal or score history needed to reconstruct the event.",
        "Before closing: no unexplained balances, no missing required scores, no unintended waitlisted charges, and exports reviewed.",
    ]
    for item in checks:
        story.append(p(f"&#9744; {item}", "Stepx"))
    story.extend([
        Spacer(1, 10),
        note("Support record.", "When reporting a problem, include the trial name, dog, registration number, class, round, timestamp, screenshot, and whether the issue occurred locally or on the deployed site.", PALE),
        Spacer(1, 16),
        p("End of Secretary Edition", "ManualSubtitle"),
    ])

    ManualDoc(str(OUTPUT)).build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
