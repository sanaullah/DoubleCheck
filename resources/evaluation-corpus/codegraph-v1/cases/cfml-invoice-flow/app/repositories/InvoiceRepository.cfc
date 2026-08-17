component {

    function findAll() {
        return queryExecute( "SELECT * FROM invoices JOIN invoice_lines ON invoice_lines.invoice_id = invoices.id" );
    }

    function markPaid( required numeric invoiceId ) {
        return queryExecute( "UPDATE invoices SET paid = 1 WHERE id = :id", { id: arguments.invoiceId } );
    }

}
