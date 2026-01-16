const mongoose = require('mongoose');
const FeatureFlag = require('../models/FeatureFlag');
require('dotenv').config();

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
    console.log('✅ Connected to MongoDB');

    // Delete existing
    await FeatureFlag.deleteMany({ key: 'liveChatConfig' });
    console.log('🗑️  Cleared existing config');

    // Create new with all fields
    const flag = await FeatureFlag.create({
      key: 'liveChatConfig',
      isLiveChatEnabled: true,
      tawkToScript: tawkScript,
      isActive: true,
      description: 'Live chat configuration for tawk.to integration',
      environment: 'all',
    });

    console.log('\n✅ Live chat enabled successfully!');
    console.log('\n📦 Created Feature Flag:');
    console.log('   ID:', flag._id);
    console.log('   Key:', flag.key);
    console.log('   isLiveChatEnabled:', flag.isLiveChatEnabled);
    console.log('   tawkToScript length:', flag.tawkToScript?.length || 0);
    console.log('   isActive:', flag.isActive);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixLiveChat();
