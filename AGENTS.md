<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Earner signup-fee totals are captured by a database insert trigger so later account deletion never reverses a recorded fee.

Commission Sale configuration belongs in the existing settings store, package eligibility in business package JSON, and campaign selections in campaign rows so checkout and business status remain consistent.
