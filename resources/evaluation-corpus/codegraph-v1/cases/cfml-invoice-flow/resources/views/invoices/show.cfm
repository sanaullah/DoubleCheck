<cfoutput>
    <h1>Invoices</h1>
    <cfloop array="#prc.invoices#" index="invoice">
        <p>#invoice.id# — #invoice.total#</p>
    </cfloop>
</cfoutput>
