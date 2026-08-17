export async function loadInvoices() {
    const response = await fetch( "/api/v1/invoices" );
    return response.json();
}
