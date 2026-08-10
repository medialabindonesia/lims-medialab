type QuotationEmailCustomer = {
  customerCode?: string | null;
  name: string;
  company?: string | null;
  email?: string | null;
  recipientEmail1?: string | null;
  contactPerson?: string | null;
};

export function defaultQuotationEmail(quotation: {
  quotationNo: string;
  customer: QuotationEmailCustomer;
}) {
  const recipient =
    quotation.customer.recipientEmail1 || quotation.customer.email || "";
  const greeting = quotation.customer.contactPerson
    ? `Yth. Bapak/Ibu ${quotation.customer.contactPerson}`
    : `Yth. Bapak/Ibu ${quotation.customer.name}`;

  return {
    toEmail: recipient,
    ccEmails: [] as string[],
    subject: `Penawaran Pengujian ${quotation.quotationNo} - Medialab`,
    bodyText: `${greeting},\n\nTerlampir kami sampaikan quotation ${quotation.quotationNo} untuk kebutuhan pengujian ${quotation.customer.company || quotation.customer.name}.\n\nMohon meninjau ruang lingkup, parameter, TAT, dan nilai penawaran pada dokumen terlampir. Silakan membalas email ini bila ada hal yang perlu disesuaikan.\n\nTerima kasih.\nTim Medialab`,
  };
}

export function customerIdentityText(customer: QuotationEmailCustomer) {
  return [
    `Kode customer: ${customer.customerCode || "-"}`,
    `Nama: ${customer.name}`,
    `Perusahaan: ${customer.company || "-"}`,
    `Contact person: ${customer.contactPerson || "-"}`,
    `Email: ${customer.email || customer.recipientEmail1 || "-"}`,
  ].join("\n");
}
