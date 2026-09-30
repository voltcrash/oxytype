import { StandaloneHeader } from "./StandaloneHeader";

export function SecurityPolicy() {
  return (
    <>
      <StandaloneHeader label="Security Policy" />
      <main class="h-max text-text [&_a]:inline-block [&_a]:text-sub [&_a]:underline [&_a:hover]:text-text [&_h1]:mt-12 [&_h1]:mb-[0.67em] [&_h1]:text-[2rem] [&_h1]:font-normal [&_h1]:text-main [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-10 [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-10">
        <p>
          We take the security and integrity of Monkeytype very seriously. If
          you have found a vulnerability, please report it{" "}
          <abbr title="As Soon As Possible">ASAP</abbr> so we can quickly
          remediate the issue.
        </p>
        <p>Table of Contents</p>
        {/* The last three internal links are redunant but give more context to the user when viewing the table of contents */}
        <ul>
          <li>
            {" "}
            <a href="#Vulnerability_Disclosure">
              How to Disclose a Vulnerability
            </a>{" "}
          </li>
          <li>
            {" "}
            <a href="#Submission_Guidelines">Submission Guidelines</a>{" "}
          </li>
        </ul>

        <h1 id="Vulnerability_Disclosure">How to Disclose a Vulnerability</h1>
        <p>
          For vulnerabilities that impact the confidentiality, integrity, and
          availability of Monkeytype services, please send your disclosure via{" "}
          <span class="inline-flex">
            {" "}
            <a href="mailto:contact@monkeytype.com" rel="noopener">
              email
            </a>{" "}
            .
          </span>{" "}
          &nbsp;For non-security related platform bugs, follow the bug
          submission{" "}
          <span class="inline-flex">
            {" "}
            <a href="https://github.com/monkeytypegame/monkeytype#bug-report-or-feature-request">
              guidelines
            </a>{" "}
            .
          </span>{" "}
          &nbsp;Include as much detail as possible to ensure reproducibility. At
          a minimum, vulnerability disclosures should include:
        </p>
        <ul>
          <li>Vulnerability Description</li>
          <li>Proof of Concept</li>
          <li>Impact</li>
          <li>Screenshots or Proof</li>
        </ul>

        <h1 id="Submission_Guidelines">Submission Guidelines</h1>
        <p>
          Do not engage in activities that might cause a denial of service
          condition, create significant strains on critical resources, or
          negatively impact users of the site outside of test accounts.
        </p>
      </main>
    </>
  );
}
