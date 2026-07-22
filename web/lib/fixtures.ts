import transactions from "../fixtures/transactions.json";
import customers from "../fixtures/customers.json";
import kycDocs from "../fixtures/kyc_docs.json";
import historicalFraudCases from "../fixtures/historical_fraud_cases.json";
import sanctionsWatchlist from "../fixtures/sanctions_watchlist.json";

export { transactions, customers, kycDocs, historicalFraudCases, sanctionsWatchlist };

export function findKycDoc(customerId: string) {
  return (kycDocs as any[]).find((d) => d.customer_id === customerId) || null;
}

export function findTransactionsForAccount(accountId: string) {
  return (transactions as any[]).filter((t) => t.account_id === accountId);
}
