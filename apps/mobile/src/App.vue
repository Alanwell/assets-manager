<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => console.info('Asset Manager mobile launched'));
</script>

<style>
page {
  background: #f5f7fa;
  color: #1f2937;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.page {
  padding: 32rpx;
}
.card {
  margin-bottom: 24rpx;
  padding: 28rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.06);
}
.title {
  margin-bottom: 12rpx;
  font-size: 40rpx;
  font-weight: 700;
}
.muted {
  color: #64748b;
  font-size: 26rpx;
}
</style>
