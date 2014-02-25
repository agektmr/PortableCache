describe("PortableCache", function() {

  describe("canonicalizePath", function() {
    var origin  = location.origin,
        host    = location.host,
        path    = location.pathname,
        prefix  = origin+path,
        result;

    it("should return "+prefix+"/example/ against "+prefix+"/example/", function() {
      result = canonicalizePath(prefix+'example/');
      expect(result).toEqual(prefix+'example/');
    });
    it("should return "+prefix+"/example/ against //"+host+path+"/example/", function() {
      result = canonicalizePath('//'+host+path+'example/');
      expect(result).toEqual(prefix+'example/');
    })
    it("should return "+prefix+"/example/ against /example/", function() {
      result = canonicalizePath('/example/');
      expect(result).toEqual(prefix+'example/');
    });
    it("should return "+prefix+"/example/ against /example/", function() {
      result = canonicalizePath('/example/');
      expect(result).toEqual(prefix+'example/');
    });
  });

  describe("resolveSrcset", function() {
    var src = 'banner.jpeg',
        srcset = 'img/abstract_240.jpg 240w, img/abstract_640.jpg 640w, img/abstract_640.jpg 320w 2x',
        i = 0,
        set = [
          { x:1, w:1000, a:'banner.jpeg' },
          { x:2, w:1000, a:'banner.jpeg' },
          { x:1, w:640 , a:'img/abstract_640.jpg' },
          { x:1, w:320 , a:'img/abstract_640.jpg' },
          { x:2, w:320 , a:'img/abstract_640.jpg' },
        ], x, w, a, url;

    beforeEach(function() {
      url = resolveSrcset(src, srcset, set[i].x, set[i].w);
    });

    afterEach(function() {
      i++;
    });

    it("should return banner.jpeg", function() {
      expect(url).toEqual(set[i].a);
    });
    it("should return banner.jpeg", function() {
      expect(url).toEqual(set[i].a);
    });
    it("should return img/abstract_640.jpg", function() {
      expect(url).toEqual(set[i].a);
    });
    it("should return img/abstract_640.jpg", function() {
      expect(url).toEqual(set[i].a);
    });
    it("should return img/abstract_640.jpg", function() {
      expect(url).toEqual(set[i].a);
    });
  });

  if (requestFileSystem) {
    // Initialization
    describe('FileSystem', function() {
      var fs = new fs();
      it('can convert URL to FileSytem valid URL', function() {
        fs.set({
          url: 'http://example.com/img/image.jpg',
          content: 'jpeg_image_test',
          mimetype: 'image/jpeg',
          version: '20140224'
        },
        function() {

        },
        function() {

        },
        function() {
          
        });
      });
      it('can set data in FileSystem', function() {

      });
      it('can get data in FileSystem', function() {

      });
      it('can remove data in FileSystem', function() {

      });
    });
  }

  if (indexedDB) {
    describe('IndexedDB', function() {
      it('can set data in FileSystem', function() {

      });
      it('can get data in FileSystem', function() {

      });
      it('can remove data in FileSystem', function() {

      });
    });
  }

  if (openDatabase) {
    describe('WebSQL', function() {
      it('can set data in FileSystem', function() {

      });
      it('can get data in FileSystem', function() {

      });
      it('can remove data in FileSystem', function() {

      });
    });
  }

  if (localStorage) {
    describe("LocalStorage", function() {
      var _ls = null,
          url = '../example/img/abstract1_640x428.jpg',
          content = 'dummy_content',
          mimetype = 'image/jpg',
          version = '20131229';
      var dummyCallback = function() {},
          dummyError    = function() {}; 
      var data = {
            url:      url,
            src:      url,
            content:  content,
            mimetype: mimetype,
            version:  version
          };

      it("should be able to initialize", function() {
        _ls = new ls(dummyCallback, dummyError);
        expect(dummyCallback).toHaveBeenCalled();
        expect(dummyError).not.toHaveBeenCalled();
      });

      it("should be able to set data", function() {
        _ls.set(data, dummyCallback, dummyError);
        expect(dummyCallback).toHaveBeenCalled();
        expect(dummyError).not.toHaveBeenCalled();
      });
    });
  }
});