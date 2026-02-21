const mongoose = require('mongoose');
const FeatureFlag = require('../models/FeatureFlag');
require('dotenv').config();
const logger = require('../utils/logger');

const tawkScript = `<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/67838c7649e2fd8dfef3c5b9/1ihveb0u5';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->`;

async function fixLiveChat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Delete existing
    await FeatureFlag.deleteMany({ key: 'liveChatConfig' });
    logger.info('🗑️  Cleared existing config');

    // Create new with all fields
    const flag = await FeatureFlag.create({
      key: 'liveChatConfig',
      isLiveChatEnabled: true,
      tawkToScript: tawkScript,
      isActive: true,
      description: 'Live chat configuration for tawk.to integration',
      environment: 'all',
    });

    logger.info('\n✅ Live chat enabled successfully!');
    logger.info('\n📦 Created Feature Flag:');
    logger.info('   ID:', flag._id);
    logger.info('   Key:', flag.key);
    logger.info('   isLiveChatEnabled:', flag.isLiveChatEnabled);
    logger.info('   tawkToScript length:', flag.tawkToScript?.length || 0);
    logger.info('   isActive:', flag.isActive);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLiveChat();
