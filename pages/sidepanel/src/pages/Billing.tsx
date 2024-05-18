import Layout from '@src/components/Layout';
import { billingInfoStorage, useStorage } from '@chrome-extension-boilerplate/shared';
import { Button, Typography } from '@material-tailwind/react';

export default function Billing() {
  const { totalPrice, totalToken, tokenUsageInfo, requestCount } = useStorage(billingInfoStorage);

  return (
    <Layout>
      <Typography as="h1" className="text-2xl font-semibold">
        Billing
      </Typography>
      <Typography>Total Price: {numberWithCurrency(totalPrice)}</Typography>
      <Typography>Total Token: {numberWithCommas(totalToken)}</Typography>
      <Typography>Token Usage Input: {numberWithCommas(tokenUsageInfo.input)}</Typography>
      <Typography>Token Usage Output: {numberWithCommas(tokenUsageInfo.output)}</Typography>

      <Typography>Total Request Count: {numberWithCommas(requestCount.total)}</Typography>
      <Typography>Request Count Input: {numberWithCommas(requestCount.input)}</Typography>
      <Typography>Request Count Output: {numberWithCommas(requestCount.output)}</Typography>
      <Typography>
        Average Token per Request: {Math.floor(numberWithCommas(totalToken / requestCount.total || 0))}
      </Typography>

      <Button color="blue" size="sm" className="mt-4" onClick={billingInfoStorage.reset}>
        Reset
      </Button>
    </Layout>
  );
}

const numberWithCurrency = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 4,
}).format;
const numberWithCommas = Intl.NumberFormat('en-US').format;
