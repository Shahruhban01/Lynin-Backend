const mongoose = require('mongoose');
const FeatureFlag = require('../models/FeatureFlag');
require('dotenv').config();
const logger = require('../utils/logger');

const tawkScript = `
<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/63c4efe547425128790dc98a/1jeng8p24';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>
<!--End of Tawk.to Script-->
`;

async function enableLiveChat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    await FeatureFlag.findOneAndUpdate(
      { key: 'liveChatConfig' },
      {
        key: 'liveChatConfig',
        isLiveChatEnabled: true,
        tawkToScript: tawkScript.trim(),
        isActive: true,
      },
      { upsert: true, new: true }
    );

    logger.info('✅ Live chat enabled successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

enableLiveChat();
